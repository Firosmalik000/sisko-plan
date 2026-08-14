<?php

namespace App\Actions\Sales;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\ApplyCashTransaction;
use App\Actions\Ledgers\ApplyStockMovement;
use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Ledgers\LedgerTimestamp;
use App\Actions\Ledgers\NextDocumentNumber;
use App\Models\FinancialAccount;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\Store;
use App\Models\User;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostSaleReturn
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyStockMovement $stock, private ApplyCashTransaction $cash, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    /** @param array<int, array{sale_item_id:int, quantity:string}> $items */
    public function handle(Store $store, User $actor, int $saleId, int $accountId, array $items, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): SaleReturn
    {
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(compact('saleId', 'accountId', 'items', 'notes') + ['occurred_at' => $date->toISOString()]);

        try {
            return DB::transaction(function () use ($store, $actor, $saleId, $accountId, $items, $date, $notes, $idempotencyKey, $requestHash, $ipAddress): SaleReturn {
                $existing = $this->idempotency->existing(fn (): ?SaleReturn => SaleReturn::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing !== null) {
                    return $existing;
                }
                $sale = Sale::query()->where(['id' => $saleId, 'store_id' => $store->id])->lockForUpdate()->firstOrFail();
                if ($date->lt(CarbonImmutable::parse((string) $sale->occurred_at))) {
                    throw ValidationException::withMessages(['occurred_at' => 'Waktu retur tidak boleh mendahului penjualan.']);
                }
                FinancialAccount::query()->where(['id' => $accountId, 'store_id' => $store->id, 'is_active' => true])->firstOrFail();
                if ($items === []) {
                    throw ValidationException::withMessages(['items' => 'Minimal satu item retur wajib diisi.']);
                }
                $saleItemIds = array_column($items, 'sale_item_id');
                if (count($saleItemIds) !== count(array_unique($saleItemIds))) {
                    throw ValidationException::withMessages(['items' => 'Item retur tidak boleh duplikat.']);
                }
                $saleItems = SaleItem::query()->where(['store_id' => $store->id, 'sale_id' => $sale->id])
                    ->whereIn('id', $saleItemIds)->get()->keyBy('id');
                if ($saleItems->count() !== count($items)) {
                    throw ValidationException::withMessages(['items' => 'Item penjualan tidak ditemukan pada toko atau dokumen ini.']);
                }
                $calculatedItems = [];
                $totalRefund = '0.0000';
                $totalCogs = '0.0000';
                foreach ($items as $index => $item) {
                    $saleItem = $saleItems->get($item['sale_item_id']);
                    if (! $saleItem instanceof SaleItem || Decimal::compare($item['quantity'], '0', Decimal::QUANTITY_SCALE) <= 0) {
                        throw ValidationException::withMessages(["items.{$index}.quantity" => 'Kuantitas retur harus lebih besar dari nol.']);
                    }
                    $previousQuantity = (string) SaleReturnItem::query()->where(['store_id' => $store->id, 'sale_item_id' => $saleItem->id])->sum('quantity');
                    $previousBaseQuantity = (string) SaleReturnItem::query()->where(['store_id' => $store->id, 'sale_item_id' => $saleItem->id])->sum('base_quantity');
                    $previousRefund = (string) SaleReturnItem::query()->where(['store_id' => $store->id, 'sale_item_id' => $saleItem->id])->sum('refund_amount');
                    $previousCogs = (string) SaleReturnItem::query()->where(['store_id' => $store->id, 'sale_item_id' => $saleItem->id])->sum('cogs_reversed');
                    $newReturnedQuantity = Decimal::add($previousQuantity, $item['quantity'], Decimal::QUANTITY_SCALE);
                    if (Decimal::compare($newReturnedQuantity, $saleItem->quantity, Decimal::QUANTITY_SCALE) > 0) {
                        throw ValidationException::withMessages(["items.{$index}.quantity" => 'Kuantitas retur melebihi sisa item yang dapat diretur.']);
                    }
                    $isFinalReturn = Decimal::compare($newReturnedQuantity, $saleItem->quantity, Decimal::QUANTITY_SCALE) === 0;
                    if ($isFinalReturn) {
                        $refund = Decimal::subtract($saleItem->net_total, $previousRefund, Decimal::MONEY_SCALE);
                        $cogs = Decimal::subtract($saleItem->cogs_amount, $previousCogs, Decimal::MONEY_SCALE);
                        $baseQuantity = Decimal::subtract((string) $saleItem->base_quantity, $previousBaseQuantity, Decimal::QUANTITY_SCALE);
                    } else {
                        $ratio = Decimal::divide($item['quantity'], $saleItem->quantity, 12);
                        $refund = Decimal::multiply($saleItem->net_total, $ratio);
                        $cogs = Decimal::multiply($saleItem->cogs_amount, $ratio);
                        $baseQuantity = Decimal::multiply($item['quantity'], $saleItem->conversion_factor, Decimal::QUANTITY_SCALE);
                    }
                    if (Decimal::compare($baseQuantity, '0', Decimal::QUANTITY_SCALE) <= 0) {
                        throw ValidationException::withMessages(["items.{$index}.quantity" => 'Hasil konversi kuantitas retur tidak valid.']);
                    }
                    $calculatedItems[] = [
                        'sale_item_id' => $saleItem->id, 'product_id' => $saleItem->product_id,
                        'quantity' => $item['quantity'], 'base_quantity' => $baseQuantity,
                        'refund_amount' => $refund, 'cogs_reversed' => $cogs,
                        'unit_cost_snapshot' => Decimal::divide($cogs, $baseQuantity, Decimal::MONEY_SCALE),
                        'gross_profit_reversed' => Decimal::subtract($refund, $cogs, Decimal::MONEY_SCALE),
                    ];
                    $totalRefund = Decimal::add($totalRefund, $refund, Decimal::MONEY_SCALE);
                    $totalCogs = Decimal::add($totalCogs, $cogs, Decimal::MONEY_SCALE);
                }
                usort($calculatedItems, fn (array $left, array $right): int => [(int) $left['product_id'], (int) $left['sale_item_id']] <=> [(int) $right['product_id'], (int) $right['sale_item_id']]);
                $saleReturn = SaleReturn::create([
                    'store_id' => $store->id, 'sale_id' => $sale->id, 'financial_account_id' => $accountId,
                    'document_number' => $this->numbers->handle($store->id, 'ret', $date),
                    'refund_amount' => $totalRefund, 'cogs_reversed' => $totalCogs,
                    'gross_profit_reversed' => Decimal::subtract($totalRefund, $totalCogs, Decimal::MONEY_SCALE),
                    'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash,
                    'occurred_at' => $date, 'notes' => $notes, 'created_by_user_id' => $actor->id, 'posted_at' => now(),
                ]);
                foreach ($calculatedItems as $item) {
                    $this->stock->handle(
                        $store->id, (int) $item['product_id'], (string) $item['base_quantity'], (string) $item['unit_cost_snapshot'],
                        'sale_return', $saleReturn, $date, $actor, $notes, false, (string) $item['cogs_reversed'],
                    );
                    SaleReturnItem::create(['store_id' => $store->id, 'sale_return_id' => $saleReturn->id, ...$item]);
                }
                if (Decimal::compare($totalRefund, '0', Decimal::MONEY_SCALE) > 0) {
                    $this->cash->handle($store->id, $accountId, 'out', $totalRefund, 'sale_refund', $saleReturn, $date, $actor, $notes);
                }
                $this->audit->handle($actor, 'sale.returned', $saleReturn, $store, $ipAddress, ['sale_document' => $sale->document_number, 'refund_amount' => $totalRefund]);

                return $saleReturn;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?SaleReturn => SaleReturn::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->first(), $requestHash, $exception);
        }
    }
}
