<?php

namespace App\Actions\Purchasing;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\ApplyStockMovement;
use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Ledgers\LedgerTimestamp;
use App\Actions\Ledgers\NextDocumentNumber;
use App\Models\FinancialAccount;
use App\Models\ProductUnit;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostPurchase
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyStockMovement $stock, private ApplySupplierPayable $payable, private ApplyPurchasePayment $payments, private PurchaseCalculator $calculator, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    /** @param array<int, array{product_unit_id:int, quantity:string, unit_price:string}> $items */
    public function handle(Store $store, User $actor, int $supplierId, array $items, string $discount, string $additionalCost, ?int $accountId, string $paidAmount, string $occurredAt, ?string $supplierInvoice, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): Purchase
    {
        $supplierInvoice = $supplierInvoice === '' ? null : $supplierInvoice;
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(compact('supplierId', 'items', 'discount', 'additionalCost', 'accountId', 'paidAmount', 'supplierInvoice', 'notes') + ['occurred_at' => $date->toISOString()]);

        try {
            return DB::transaction(function () use ($store, $actor, $supplierId, $items, $discount, $additionalCost, $accountId, $paidAmount, $date, $supplierInvoice, $notes, $idempotencyKey, $requestHash, $ipAddress): Purchase {
                $existing = $this->idempotency->existing(fn (): ?Purchase => Purchase::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing) {
                    return $existing;
                }
                Supplier::query()->where(['id' => $supplierId, 'store_id' => $store->id])->firstOrFail();
                $productUnitIds = array_column($items, 'product_unit_id');
                if (count($productUnitIds) !== count(array_unique($productUnitIds))) {
                    throw ValidationException::withMessages(['items' => 'Satuan produk tidak boleh duplikat.']);
                }
                $resolvedItems = [];
                foreach ($items as $item) {
                    $productUnit = ProductUnit::query()->with(['product', 'productVariant', 'unit'])
                        ->where(['id' => $item['product_unit_id'], 'store_id' => $store->id, 'is_active' => true])->firstOrFail();
                    abort_if(! $productUnit->product->is_active || ! $productUnit->unit->is_active || $productUnit->productVariant?->is_active === false, 422);
                    $resolvedItems[] = [
                        'product_id' => $productUnit->product_id, 'product_variant_id' => $productUnit->product_variant_id, 'product_unit_id' => $productUnit->id,
                        'stock_variant_id' => $productUnit->product->variant_mode === 'separate' ? $productUnit->product_variant_id : null,
                        'product_name' => $productUnit->productVariant === null ? $productUnit->product->name : "{$productUnit->product->name} - {$productUnit->productVariant->name}",
                        'sku' => $productUnit->sku,
                        'unit_name' => $productUnit->unit->name, 'unit_symbol' => $productUnit->unit->symbol,
                        'quantity' => $item['quantity'], 'conversion_factor' => (string) $productUnit->conversion_factor,
                        'unit_price' => $item['unit_price'],
                    ];
                }
                $calculation = $this->calculator->calculate($resolvedItems, $discount, $additionalCost);
                usort($calculation['items'], fn (array $left, array $right): int => [(int) $left['product_id'], (int) $left['product_unit_id']] <=> [(int) $right['product_id'], (int) $right['product_unit_id']]);
                if (Decimal::compare($paidAmount, '0', Decimal::MONEY_SCALE) < 0 || Decimal::compare($paidAmount, $calculation['total'], Decimal::MONEY_SCALE) > 0) {
                    throw ValidationException::withMessages(['paid_amount' => 'Pembayaran awal tidak boleh negatif atau melebihi total pembelian.']);
                }
                if (Decimal::compare($paidAmount, '0', Decimal::MONEY_SCALE) > 0) {
                    if ($accountId === null) {
                        throw ValidationException::withMessages(['account_id' => 'Akun pembayaran wajib dipilih.']);
                    }
                    FinancialAccount::query()->where(['id' => $accountId, 'store_id' => $store->id])->firstOrFail();
                }
                $purchase = Purchase::create([
                    'store_id' => $store->id, 'supplier_id' => $supplierId,
                    'document_number' => $this->numbers->handle($store->id, 'pur', $date), 'supplier_invoice_number' => $supplierInvoice,
                    'subtotal' => $calculation['subtotal'], 'discount_amount' => $calculation['discount'],
                    'additional_cost' => $calculation['additional_cost'], 'total_amount' => $calculation['total'],
                    'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash, 'occurred_at' => $date,
                    'notes' => $notes, 'created_by_user_id' => $actor->id, 'posted_at' => now(),
                ]);
                foreach ($calculation['items'] as $item) {
                    PurchaseItem::create(['store_id' => $store->id, 'purchase_id' => $purchase->id, ...$item]);
                    $stockVariantId = $item['stock_variant_id'] === null ? null : (int) $item['stock_variant_id'];
                    $this->stock->handle($store->id, (int) $item['product_id'], (string) $item['base_quantity'], (string) $item['base_unit_cost'], 'purchase', $purchase, $date, $actor, $notes, false, (string) $item['landed_total'], $stockVariantId);
                }
                $this->payable->handle($store->id, $supplierId, 'increase', $calculation['total'], 'purchase', $purchase, $date, $actor, $notes);
                if (Decimal::compare($paidAmount, '0', Decimal::MONEY_SCALE) > 0) {
                    $paymentHash = $this->idempotency->hash(['purchase_id' => $purchase->id, 'account_id' => $accountId, 'amount' => $paidAmount, 'occurred_at' => $date->toISOString(), 'notes' => $notes]);
                    $this->payments->handle($purchase, $accountId, $paidAmount, $date, $actor, $notes, "purchase-{$idempotencyKey}", $paymentHash);
                }
                $this->audit->handle($actor, 'purchase.posted', $purchase, $store, $ipAddress, ['document_number' => $purchase->document_number, 'total_amount' => $calculation['total'], 'paid_amount' => $paidAmount]);

                return $purchase;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            $existing = $this->idempotency->existing(fn (): ?Purchase => Purchase::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->first(), $requestHash);
            if ($existing !== null) {
                return $existing;
            }
            if ($supplierInvoice !== null && Purchase::query()->where(['store_id' => $store->id, 'supplier_id' => $supplierId, 'supplier_invoice_number' => $supplierInvoice])->exists()) {
                throw ValidationException::withMessages(['supplier_invoice_number' => 'Nomor invoice supplier sudah digunakan.']);
            }

            throw $exception;
        }
    }
}
