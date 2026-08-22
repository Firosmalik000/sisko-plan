<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $product_id
 * @property string $public_id
 * @property string $name
 */
#[Fillable(['store_id', 'product_id', 'name', 'photo_path', 'is_active'])]
class ProductVariant extends Model
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

    /** @return HasMany<ProductUnit, $this> */
    public function productUnits(): HasMany
    {
        return $this->hasMany(ProductUnit::class);
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
