<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $monthly_price
 * @property int $max_products
 * @property int $max_members
 * @property bool $is_default
 * @property bool $is_active
 * @property int|null $subscriptions_count
 */
#[Fillable(['code', 'name', 'description', 'monthly_price', 'max_products', 'max_members', 'is_default', 'is_active'])]
class Plan extends Model
{
    use HasPublicId;

    /** @return HasMany<Subscription, $this> */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:4',
            'max_products' => 'integer',
            'max_members' => 'integer',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
