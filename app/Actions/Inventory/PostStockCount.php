<?php

namespace App\Actions\Inventory;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Enums\StockCountStatus;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Models\Store;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PostStockCount
{
    public function __construct(private PostStockAdjustment $adjustments, private RecordAudit $audit) {}

    public function handle(Store $store, StockCount $stockCount, User $actor, ?string $ipAddress = null): void
    {
        DB::transaction(function () use ($store, $stockCount, $actor, $ipAddress): void {
            $locked = StockCount::query()
                ->where(['id' => $stockCount->id, 'store_id' => $store->id])
                ->lockForUpdate()
                ->firstOrFail();
            if ($locked->status !== StockCountStatus::Counted) {
                throw ValidationException::withMessages(['stock_count' => 'Opname harus selesai dihitung sebelum diposting.']);
            }

            $items = StockCountItem::query()
                ->where(['store_id' => $store->id, 'stock_count_id' => $locked->id])
                ->lockForUpdate()
                ->get();
            if ($items->contains(fn (StockCountItem $item): bool => $item->counted_quantity === null)) {
                throw ValidationException::withMessages(['items' => 'Semua produk harus dihitung sebelum opname diposting.']);
            }

            $incoming = [];
            $outgoing = [];
            foreach ($items as $item) {
                $difference = (string) $item->difference_quantity;
                $comparison = Decimal::compare($difference, '0', Decimal::QUANTITY_SCALE);
                if ($comparison > 0) {
                    $incoming[] = [
                        'product_id' => $item->product_id,
                        'product_variant_id' => $item->product_variant_id,
                        'quantity' => $difference,
                        'unit_cost' => (string) $item->snapshot_unit_cost,
                    ];
                } elseif ($comparison < 0) {
                    $outgoing[] = [
                        'product_id' => $item->product_id,
                        'product_variant_id' => $item->product_variant_id,
                        'quantity' => Decimal::absolute($difference, Decimal::QUANTITY_SCALE),
                    ];
                }
            }

            $occurredAt = now()->toISOString();
            $notes = "Hasil stock opname {$locked->document_number}";
            if ($incoming !== []) {
                $this->adjustments->handle($store, $actor, 'opname_in', $incoming, $occurredAt, $notes, (string) Str::uuid(), $ipAddress, $locked->id);
            }
            if ($outgoing !== []) {
                $this->adjustments->handle($store, $actor, 'opname_out', $outgoing, $occurredAt, $notes, (string) Str::uuid(), $ipAddress, $locked->id);
            }

            $locked->update([
                'status' => StockCountStatus::Posted,
                'posted_at' => now(),
                'posted_by_user_id' => $actor->id,
            ]);
            $this->audit->handle($actor, 'stock_count.posted', $locked, $store, $ipAddress, [
                'incoming_items' => count($incoming),
                'outgoing_items' => count($outgoing),
            ]);
        }, 3);
    }
}
