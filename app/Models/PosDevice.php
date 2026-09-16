<?php

namespace App\Models;

use Database\Factories\PosDeviceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['business_id', 'store_id', 'name', 'token_hash', 'status', 'activated_by_business_membership_id', 'last_seen_at', 'revoked_at'])]
#[Hidden(['token_hash'])]
class PosDevice extends Model
{
    /** @use HasFactory<PosDeviceFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (PosDevice $device): void {
            $device->public_id ??= (string) Str::ulid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<BusinessMembership, $this> */
    public function activator(): BelongsTo
    {
        return $this->belongsTo(BusinessMembership::class, 'activated_by_business_membership_id');
    }

    protected function casts(): array
    {
        return ['last_seen_at' => 'datetime', 'revoked_at' => 'datetime'];
    }
}
