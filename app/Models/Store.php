<?php

namespace App\Models;

use App\Enums\StoreStatus;
use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $public_id
 * @property int $business_id
 * @property string $name
 * @property StoreStatus $status
 * @property int|null $active_members_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Business $business
 * @property-read Country|null $country
 * @property-read StoreSetting|null $settings
 * @property-read StoreMembership $pivot
 */
#[Fillable(['business_id', 'country_id', 'name', 'status'])]
class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Store $store): void {
            $store->public_id ??= (string) Str::ulid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function catalogNamespaceKey(): string
    {
        return "store:{$this->public_id}";
    }

    public function currencyCode(): string
    {
        return $this->settings()->value('currency') ?? $this->country()->value('currency_code') ?? 'IDR';
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return HasMany<StoreMembership, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(StoreMembership::class);
    }

    /** @return BelongsTo<Country, $this> */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    /** @return BelongsToMany<Marketplace, $this> */
    public function marketplaces(): BelongsToMany
    {
        return $this->belongsToMany(Marketplace::class, 'store_marketplace')->withPivot('is_enabled')->withTimestamps();
    }

    /** @return HasOne<StoreSetting, $this> */
    public function settings(): HasOne
    {
        return $this->hasOne(StoreSetting::class);
    }

    /** @return HasMany<Category, $this> */
    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /** @return HasMany<Unit, $this> */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /** @return HasMany<Supplier, $this> */
    public function suppliers(): HasMany
    {
        return $this->hasMany(Supplier::class);
    }

    /** @return HasMany<Customer, $this> */
    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /** @return HasMany<FinancialAccount, $this> */
    public function financialAccounts(): HasMany
    {
        return $this->hasMany(FinancialAccount::class);
    }

    protected function casts(): array
    {
        return ['status' => StoreStatus::class];
    }
}
