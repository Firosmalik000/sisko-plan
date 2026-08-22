<?php

namespace App\Actions\Sales;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\ApplyCashTransaction;
use App\Actions\Ledgers\ApplyStockMovement;
use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Ledgers\LedgerTimestamp;
use App\Actions\Ledgers\NextDocumentNumber;
use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\Store;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostSale
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyStockMovement $stock, private ApplyCashTransaction $cash, private SaleCalculator $calculator, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    /** @param array<int, array{product_unit_id:int, quantity:string, item_discount:string}> $items */
    public function handle(Store $store, User $actor, int $accountId, array $items, string $transactionDiscount, string $paidAmount, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): Sale
    {
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(compact('accountId', 'items', 'transactionDiscount', 'paidAmount', 'notes') + ['occurred_at' => $date->toISOString()]);

        try {
            return DB::transaction(function () use ($store, $actor, $accountId, $items, $transactionDiscount, $paidAmount, $date, $notes, $idempotencyKey, $requestHash, $ipAddress): Sale {
                $existing = $this->idempotency->existing(fn (): ?Sale => Sale::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing !== null) {
                    return $existing;
                }
                $account = FinancialAccount::query()->where(['id' => $accountId, 'store_id' => $store->id, 'is_active' => true])->firstOrFail();
                $productUnitIds = array_column($items, 'product_unit_id');
                if (count($productUnitIds) !== count(array_unique($productUnitIds))) {
                    throw ValidationException::withMessages(['items' => 'Satuan produk di keranjang tidak boleh duplikat.']);
                }
                $resolvedItems = [];
                foreach ($items as $item) {
                    $productUnit = ProductUnit::query()->with(['product', 'productVariant', 'unit'])
                        ->where(['id' => $item['product_unit_id'], 'store_id' => $store->id, 'is_active' => true])->firstOrFail();
                    if (! $productUnit->product->is_active || ! $productUnit->unit->is_active || $productUnit->productVariant?->is_active === false) {
                        throw ValidationException::withMessages(['items' => 'Produk dan satuan harus aktif.']);
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
                $calculation = $this->calculator->calculate($resolvedItems, $transactionDiscount);
                usort($calculation['items'], fn (array $left, array $right): int => [(int) $left['product_id'], (int) $left['product_unit_id']] <=> [(int) $right['product_id'], (int) $right['product_unit_id']]);
                if (Decimal::compare($paidAmount, $calculation['total'], Decimal::MONEY_SCALE) < 0 || Decimal::compare($paidAmount, '999999999999999.9999', Decimal::MONEY_SCALE) > 0) {
                    throw ValidationException::withMessages(['paid_amount' => 'Nominal dibayar tidak boleh kurang dari total atau melebihi kapasitas yang didukung.']);
                }
                $change = Decimal::subtract($paidAmount, $calculation['total'], Decimal::MONEY_SCALE);
                if ($account->type !== FinancialAccountType::Cash && Decimal::compare($change, '0', Decimal::MONEY_SCALE) > 0) {
                    throw ValidationException::withMessages(['paid_amount' => 'Pembayaran non-tunai harus sama dengan total penjualan.']);
                }
                $sale = Sale::create([
                    'store_id' => $store->id, 'document_number' => $this->numbers->handle($store->id, 'sale', $date),
                    'subtotal' => $calculation['subtotal'], 'item_discount_amount' => $calculation['item_discount'],
                    'transaction_discount_amount' => $calculation['transaction_discount'], 'total_amount' => $calculation['total'],
                    'paid_amount' => $paidAmount, 'change_amount' => $change, 'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash, 'occurred_at' => $date, 'notes' => $notes,
                    'created_by_user_id' => $actor->id, 'posted_at' => now(),
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
                    'payment_method' => $account->type === FinancialAccountType::Cash ? 'cash' : 'qris',
                    'amount' => $calculation['total'], 'tendered_amount' => $paidAmount, 'change_amount' => $change,
                    'occurred_at' => $date, 'created_by_user_id' => $actor->id,
                ]);
                $this->cash->handle($store->id, $accountId, 'in', $calculation['total'], 'sale_payment', $payment, $date, $actor, $notes);
                $this->audit->handle($actor, 'sale.posted', $sale, $store, $ipAddress, ['document_number' => $sale->document_number, 'total_amount' => $calculation['total']]);

                return $sale;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?Sale => Sale::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->first(), $requestHash, $exception);
        }
    }
}
