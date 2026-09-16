<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

/** @property-read Pivot $pivot */
#[Fillable(['code', 'label', 'kind', 'checkout_method', 'is_active'])]
class PaymentMethod extends Model
{
    public function getRouteKeyName(): string
    {
        return 'code';
    }

    /** @return BelongsToMany<Country, $this> */
    public function countries(): BelongsToMany
    {
        return $this->belongsToMany(Country::class)->withPivot(['priority', 'is_enabled']);
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
