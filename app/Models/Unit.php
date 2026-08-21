<?php

namespace App\Models;

use App\Enums\UnitType;
use App\Models\Concerns\HasPublicId;
use Database\Factories\UnitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property UnitType $unit_type
 */
#[Fillable(['store_id', 'name', 'symbol', 'unit_type', 'is_active'])]
class Unit extends Model
{
    /** @use HasFactory<UnitFactory> */
    use HasFactory, HasPublicId;

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return HasMany<Product, $this> */
    public function baseProducts(): HasMany
    {
        return $this->hasMany(Product::class, 'base_unit_id');
    }

    /** @return HasMany<ProductUnit, $this> */
    public function productUnits(): HasMany
    {
        return $this->hasMany(ProductUnit::class);
    }

    protected function casts(): array
    {
        return [
            'unit_type' => UnitType::class,
            'is_active' => 'boolean',
        ];
    }
}
