<?php

namespace App\Actions\Sales;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\ApplyCashTransaction;
use App\Actions\Ledgers\ApplyStockMovement;
use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Ledgers\LedgerTimestamp;
use App\Actions\Ledgers\NextDocumentNumber;
use App\Enums\FinancialAccountType;
use App\Models\BusinessMembership;
use App\Models\CashTransaction;
use App\Models\FinancialAccount;
use App\Models\PosDevice;
use App\Models\ProductUnit;
use App\Models\RegisterSession;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\User;
use App\Services\Commerce\CountryCommerceCatalog;
use App\Support\Decimal;
use App\Support\PaymentMethodCatalog;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class PostSale
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyStockMovement $stock, private ApplyCashTransaction $cash, private SaleCalculator $calculator, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps, private UpsertSaleCustomer $customers) {}

    /** @param array<int, array{product_unit_id:int, quantity:string, item_discount:string}> $items */
    public function handle(Store $store, BusinessMembership|User $actor, int $accountId, array $items, string $transactionDiscount, string $paidAmount, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null, ?UploadedFile $paymentProof = null, ?string $customerName = null, ?string $customerPhone = null, ?string $customerEmail = null, string $salesChannel = 'in_store', ?string $paymentMethod = null, ?string $marketplaceCode = null, ?string $externalOrderNumber = null, bool $alignWithLatestLedger = false, ?RegisterSession $registerSession = null, ?PosDevice $device = null, bool $requireRegisterSession = false): Sale
    {
        $actor = BusinessMembership::operational($store, $actor);
        $customerName = $customerName === null || trim($customerName) === '' ? null : trim($customerName);
        $customerPhone = $customerPhone === null || trim($customerPhone) === '' ? null : trim($customerPhone);
        $customerEmail = $customerEmail === null || trim($customerEmail) === '' ? null : Str::lower(trim($customerEmail));
        $marketplaceCode = $marketplaceCode === null || trim($marketplaceCode) === '' ? null : trim($marketplaceCode);
        $externalOrderNumber = $externalOrderNumber === null || trim($externalOrderNumber) === '' ? null : trim($externalOrderNumber);
        $date = $this->timestamps->parse($store, $occurredAt);
        $proofChecksum = $paymentProof?->isValid() ? hash_file('sha256', $paymentProof->getRealPath()) : null;
        $countryCode = $store->country()->value('code');
        $normalizedCustomerPhone = $customerPhone === null ? null : UpsertSaleCustomer::normalizePhone($customerPhone, $countryCode);
        $requestPayload = compact('accountId', 'items', 'transactionDiscount', 'paidAmount', 'notes', 'customerName', 'customerEmail', 'salesChannel', 'paymentMethod', 'marketplaceCode', 'externalOrderNumber') + [
            'customer_phone' => $normalizedCustomerPhone,
            'occurred_at' => $date->toISOString(),
            'register_session_id' => $registerSession?->id,
            'pos_device_id' => $device?->id,
        ];
        if (is_string($proofChecksum)) {
            $requestPayload['payment_proof_sha256'] = $proofChecksum;
        }
        $requestHash = $this->idempotency->hash($requestPayload);
        $newProofPath = null;

        try {
            return DB::transaction(function () use ($store, $actor, $accountId, $items, $transactionDiscount, $paidAmount, $date, $notes, $idempotencyKey, $requestHash, $ipAddress, $paymentProof, $customerName, $customerPhone, $customerEmail, $salesChannel, $paymentMethod, $marketplaceCode, $externalOrderNumber, $countryCode, $alignWithLatestLedger, $registerSession, $device, $requireRegisterSession, &$newProofPath): Sale {
                $existing = $this->idempotency->existing(fn (): ?Sale => Sale::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing !== null) {
                    return $existing;
                }
                $lockedSession = $registerSession === null ? null : RegisterSession::query()->with('register')->whereKey($registerSession->id)->lockForUpdate()->firstOrFail();
                if ($requireRegisterSession && $salesChannel === 'in_store' && $lockedSession === null) {
                    throw ValidationException::withMessages(['register_session' => __('An open register shift is required for in-store checkout.')]);
                }
                if ($lockedSession !== null) {
                    $validSession = $lockedSession->store_id === $store->id
                        && $lockedSession->status === 'open'
                        && $lockedSession->opened_by_business_membership_id === $actor->id
                        && ($device === null || ($lockedSession->pos_device_id === $device->id && $device->store_id === $store->id));
                    if (! $validSession) {
                        throw ValidationException::withMessages(['register_session' => __('The register shift does not match the cashier, Store, or POS device.')]);
                    }
                }
                $account = FinancialAccount::query()->where(['id' => $accountId, 'store_id' => $store->id, 'is_active' => true])->firstOrFail();
                $marketplace = $salesChannel === 'marketplace'
                    ? app(CountryCommerceCatalog::class)->marketplaces($store)->firstWhere('code', $marketplaceCode)
                    : null;
                if ($salesChannel === 'marketplace' && $marketplace === null) {
                    throw ValidationException::withMessages(['marketplace_code' => __('This marketplace is not available for the store country.')]);
                }
                $resolvedPaymentMethod = $paymentMethod ?? ($account->type === FinancialAccountType::Cash ? 'cash' : 'qris');
                $validPaymentAccount = $resolvedPaymentMethod === 'marketplace'
                    ? $salesChannel === 'marketplace'
                        && $account->type === FinancialAccountType::MarketplaceClearing
                        && $account->marketplace_code === $marketplaceCode
                    : $salesChannel === 'in_store'
                        && PaymentMethodCatalog::acceptsInStoreAccount($account, $resolvedPaymentMethod, $countryCode);
                if (! $validPaymentAccount) {
                    throw ValidationException::withMessages(['payment_method' => __('The payment method does not match the receiving account.')]);
                }
                if ($lockedSession !== null && $resolvedPaymentMethod === 'cash' && $lockedSession->register->cash_financial_account_id !== $account->id) {
                    throw ValidationException::withMessages(['account_id' => __('Cash payment must use the active Register cash account.')]);
                }
                $productUnitIds = array_column($items, 'product_unit_id');
                if (count($productUnitIds) !== count(array_unique($productUnitIds))) {
                    throw ValidationException::withMessages(['items' => __('Product units in the cart cannot be duplicated.')]);
                }
                $resolvedItems = [];
                foreach ($items as $item) {
                    $productUnit = ProductUnit::query()->with(['product', 'productVariant', 'unit'])
                        ->where(['id' => $item['product_unit_id'], 'store_id' => $store->id, 'is_active' => true])->firstOrFail();
                    if (! $productUnit->product->is_active || ! $productUnit->unit->is_active || $productUnit->productVariant?->is_active === false) {
                        throw ValidationException::withMessages(['items' => __('The product and unit must be active.')]);
                    }
                    if ($productUnit->product->quantity_mode === 'fixed' && Decimal::compare($item['quantity'], Decimal::add($item['quantity'], '0', 0), Decimal::QUANTITY_SCALE) !== 0) {
                        throw ValidationException::withMessages(['items' => __('Fixed quantity products require whole quantities.')]);
                    }
                    $resolvedItems[] = [
                        'product_id' => $productUnit->product_id, 'product_variant_id' => $productUnit->product_variant_id, 'product_unit_id' => $productUnit->id,
                        'stock_variant_id' => $productUnit->product->variant_mode === 'separate' ? $productUnit->product_variant_id : null,
                        'product_name' => $productUnit->productVariant === null ? $productUnit->product->name : "{$productUnit->product->name} - {$productUnit->productVariant->name}",
                        'sku' => $productUnit->sku,
                        'barcode' => $productUnit->barcode,
                        'unit_name' => $productUnit->unit->name, 'unit_symbol' => $productUnit->unit->symbol,
                        'quantity' => $item['quantity'], 'conversion_factor' => (string) $productUnit->conversion_factor,
                        'unit_price' => (string) $productUnit->selling_price, 'item_discount' => $item['item_discount'],
                    ];
                }
                if ($alignWithLatestLedger) {
                    $date = $this->alignWithLatestLedger($store->id, $accountId, $resolvedItems, $date);
                }
                $calculation = $this->calculator->calculate($resolvedItems, $transactionDiscount);
                usort($calculation['items'], fn (array $left, array $right): int => [(int) $left['product_id'], (int) $left['product_unit_id']] <=> [(int) $right['product_id'], (int) $right['product_unit_id']]);
                if (Decimal::compare($paidAmount, $calculation['total'], Decimal::MONEY_SCALE) < 0 || Decimal::compare($paidAmount, '999999999999999.9999', Decimal::MONEY_SCALE) > 0) {
                    throw ValidationException::withMessages(['paid_amount' => __('The amount paid cannot be less than the total or exceed the supported capacity.')]);
                }
                $change = Decimal::subtract($paidAmount, $calculation['total'], Decimal::MONEY_SCALE);
                if ($account->type !== FinancialAccountType::Cash && Decimal::compare($change, '0', Decimal::MONEY_SCALE) > 0) {
                    throw ValidationException::withMessages(['paid_amount' => __('A non-cash payment must equal the sale total.')]);
                }
                if (in_array($resolvedPaymentMethod, ['cash', 'marketplace'], true) && $paymentProof !== null) {
                    throw ValidationException::withMessages(['payment_proof' => __('Payment proof can only be added to direct non-cash payments.')]);
                }
                if ($paymentProof !== null) {
                    $storedProofPath = $paymentProof->storeAs(
                        "sale-payment-proofs/{$store->public_id}",
                        Str::ulid().'.'.$paymentProof->extension(),
                        'local',
                    );
                    if (! is_string($storedProofPath)) {
                        throw ValidationException::withMessages(['payment_proof' => __('The payment proof could not be saved. Upload it again.')]);
                    }
                    $newProofPath = $storedProofPath;
                }
                $customer = $this->customers->handle($store, $customerName, $customerPhone, $customerEmail);
                $currencyCode = $lockedSession !== null ? $lockedSession->currency_code : ($store->settings()->value('currency') ?? $store->country()->value('currency_code') ?? 'IDR');
                $sale = Sale::create([
                    'store_id' => $store->id, 'customer_id' => $customer?->id,
                    'document_number' => $this->numbers->handle($store->id, 'sale', $date),
                    'customer_name' => $customerName, 'customer_phone' => $customerPhone, 'customer_email' => $customerEmail,
                    'sales_channel' => $salesChannel, 'marketplace_code' => $marketplaceCode,
                    'marketplace_id' => $marketplace?->id, 'marketplace_name' => $marketplace?->label,
                    'external_order_number' => $externalOrderNumber,
                    'register_session_id' => $lockedSession?->id, 'pos_device_id' => $device?->id,
                    'currency_code' => $currencyCode,
                    'subtotal' => $calculation['subtotal'], 'item_discount_amount' => $calculation['item_discount'],
                    'transaction_discount_amount' => $calculation['transaction_discount'], 'total_amount' => $calculation['total'],
                    'paid_amount' => $paidAmount, 'change_amount' => $change, 'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash, 'occurred_at' => $date, 'notes' => $notes,
                    'cashier_name' => $actor->display_name,
                    'created_by_business_membership_id' => $actor->id, 'posted_at' => now(),
                ]);
                foreach ($calculation['items'] as $item) {
                    $stockVariantId = $item['stock_variant_id'] === null ? null : (int) $item['stock_variant_id'];
                    $movement = $this->stock->handle(
                        $store->id, (int) $item['product_id'], Decimal::subtract('0', (string) $item['base_quantity'], Decimal::QUANTITY_SCALE),
                        null, 'sale', $sale, $date, $actor, $notes, false, null, $stockVariantId,
                    );
                    $cogs = Decimal::absolute($movement->value_change, Decimal::MONEY_SCALE);
                    SaleItem::create([
                        'store_id' => $store->id, 'sale_id' => $sale->id,
                        'product_id' => $item['product_id'], 'product_variant_id' => $item['product_variant_id'], 'product_unit_id' => $item['product_unit_id'],
                        'product_name' => $item['product_name'], 'sku' => $item['sku'], 'barcode' => $item['barcode'],
                        'unit_name' => $item['unit_name'], 'unit_symbol' => $item['unit_symbol'],
                        'quantity' => $item['quantity'], 'conversion_factor' => $item['conversion_factor'], 'base_quantity' => $item['base_quantity'],
                        'unit_price' => $item['unit_price'], 'gross_subtotal' => $item['gross_subtotal'],
                        'item_discount_amount' => $item['item_discount'], 'allocated_transaction_discount' => $item['allocated_transaction_discount'],
                        'net_total' => $item['net_total'], 'unit_cost_snapshot' => $movement->unit_cost,
                        'cogs_amount' => $cogs, 'gross_profit' => Decimal::subtract((string) $item['net_total'], $cogs, Decimal::MONEY_SCALE),
                    ]);
                }
                $payment = SalePayment::create([
                    'store_id' => $store->id, 'sale_id' => $sale->id, 'financial_account_id' => $accountId,
                    'payment_method' => $resolvedPaymentMethod,
                    'currency_code' => $currencyCode,
                    'payment_proof_path' => $newProofPath,
                    'amount' => $calculation['total'], 'tendered_amount' => $paidAmount, 'change_amount' => $change,
                    'occurred_at' => $date,
                    'created_by_business_membership_id' => $actor->id,
                ]);
                $this->cash->handle($store->id, $accountId, 'in', $calculation['total'], 'sale_payment', $payment, $date, $actor, $notes, registerSessionId: $lockedSession?->id);
                $this->audit->handle($actor, 'sale.posted', $sale, $store, $ipAddress, ['document_number' => $sale->document_number, 'total_amount' => $calculation['total'], 'sales_channel' => $salesChannel]);

                return $sale;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            if ($newProofPath !== null) {
                Storage::disk('local')->delete($newProofPath);
            }

            return $this->idempotency->recover(fn (): ?Sale => Sale::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->first(), $requestHash, $exception);
        } catch (Throwable $exception) {
            if ($newProofPath !== null) {
                Storage::disk('local')->delete($newProofPath);
            }

            throw $exception;
        }
    }

    /** @param array<int, array{product_id:int, stock_variant_id:int|null}> $items */
    private function alignWithLatestLedger(int $storeId, int $accountId, array $items, CarbonImmutable $date): CarbonImmutable
    {
        $stockPairs = collect($items)
            ->map(fn (array $item): array => [(int) $item['product_id'], $item['stock_variant_id'] === null ? null : (int) $item['stock_variant_id']])
            ->unique(fn (array $pair): string => $pair[0].':'.($pair[1] ?? 'product'))
            ->values();
        $latestStockAt = StockMovement::query()->where('store_id', $storeId)
            ->where(function ($query) use ($stockPairs): void {
                foreach ($stockPairs as [$productId, $variantId]) {
                    $query->orWhere(function ($pair) use ($productId, $variantId): void {
                        $pair->where('product_id', $productId)->where('product_variant_id', $variantId);
                    });
                }
            })->max('occurred_at');
        $latestCashAt = CashTransaction::query()->where([
            'store_id' => $storeId,
            'financial_account_id' => $accountId,
        ])->max('occurred_at');

        foreach ([$latestStockAt, $latestCashAt] as $latestAt) {
            if ($latestAt !== null && $date->lt($latest = CarbonImmutable::parse((string) $latestAt))) {
                $date = $latest;
            }
        }

        return $date;
    }
}
