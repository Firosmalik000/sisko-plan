<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int<0, max> $id
 * @property string $code
 * @property string $name
 * @property string $currency_code
 * @property string $default_timezone
 * @property bool $is_active
 */
#[Fillable(['code', 'name', 'currency_code', 'default_timezone', 'is_active'])]
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
        $key = "countries.{$this->code}";
        $translated = __($key, [], $locale ?? app()->getLocale());

        return $translated === $key ? $this->name : $translated;
    }

    /** @return list<string> */
    public function timezones(): array
    {
        return config("localization.countries.{$this->code}.timezones")
            ?? [$this->default_timezone];
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
