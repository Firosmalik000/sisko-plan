<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read Collection<int, ProductUnit> $productUnits
 */
#[Fillable(['store_id', 'creation_token', 'category_id', 'base_unit_id', 'large_unit_id', 'variant_mode', 'name', 'sku', 'barcode', 'description', 'photo_path', 'is_active'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, HasPublicId;

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return BelongsTo<Unit, $this> */
    public function baseUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'base_unit_id');
    }

    /** @return BelongsTo<Unit, $this> */
    public function largeUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'large_unit_id');
    }

    /** @return HasMany<ProductVariant, $this> */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
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
