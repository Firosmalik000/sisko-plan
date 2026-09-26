<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $public_id
 * @property int $store_id
 * @property int $product_id
 * @property int|null $product_variant_id
 * @property string|null $agent_number
 * @property string|null $agent_name
 * @property string $agent_position
 * @property string $serial_number
 * @property string|null $full_serial_number
 * @property string $status
 * @property int|null $sale_id
 * @property int|null $sale_item_id
 * @property CarbonInterface|null $sold_at
 * @property string|null $notes
 */
#[Fillable([
    'store_id',
    'product_id',
    'product_variant_id',
    'agent_number',
    'agent_name',
    'agent_position',
    'serial_number',
    'full_serial_number',
    'status',
    'sale_id',
    'sale_item_id',
    'sold_at',
    'notes',
])]
class ProductSerialNumber extends Model
{
    use HasPublicId;

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<ProductVariant, $this> */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    /** @return BelongsTo<Sale, $this> */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /** @return BelongsTo<SaleItem, $this> */
    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }

    /** @param Builder<$this> $query */
    public function scopeAvailable(Builder $query): void
    {
        $query->where('status', 'available');
    }

    /**
     * Build the full composite serial number based on agent position.
     */
    public static function formatFullSerial(?string $agentNumber, string $serialNumber, string $position = 'prefix'): string
    {
        $cleanAgent = trim((string) $agentNumber);
        $cleanSerial = trim($serialNumber);

        if ($cleanAgent === '' || $position === 'none') {
            return $cleanSerial;
        }

        if ($position === 'suffix') {
            return $cleanSerial.$cleanAgent;
        }

        return $cleanAgent.$cleanSerial;
    }

    protected function casts(): array
    {
        return [
            'sold_at' => 'datetime',
        ];
    }
}
