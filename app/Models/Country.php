<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name_id', 'name_ms', 'name_en', 'currency_code', 'is_active'])]
class Country extends Model
{
    public function getRouteKeyName(): string
    {
        return 'code';
    }

    /** @return BelongsTo<Currency, $this> */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currency_code', 'code');
    }

    /** @return HasMany<Store, $this> */
    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function localizedName(?string $locale = null): string
    {
        return match ($locale ?? app()->getLocale()) {
            'ms' => $this->name_ms,
            'en' => $this->name_en,
            default => $this->name_id,
        };
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
