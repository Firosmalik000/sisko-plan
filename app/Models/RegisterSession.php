<?php

namespace App\Models;

use Database\Factories\RegisterSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable(['store_id', 'register_id', 'pos_device_id', 'opened_by_business_membership_id', 'closed_by_business_membership_id', 'currency_code', 'opening_cash', 'expected_cash', 'counted_cash', 'variance', 'opened_at', 'closed_at', 'status'])]
class RegisterSession extends Model
{
    /** @use HasFactory<RegisterSessionFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(fn (RegisterSession $session) => $session->public_id ??= (string) Str::ulid());
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsTo<Register, $this> */
    public function register(): BelongsTo
    {
        return $this->belongsTo(Register::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<BusinessMembership, $this> */
    public function opener(): BelongsTo
    {
        return $this->belongsTo(BusinessMembership::class, 'opened_by_business_membership_id');
    }

    /** @return HasMany<RegisterDrawerMovement, $this> */
    public function movements(): HasMany
    {
        return $this->hasMany(RegisterDrawerMovement::class);
    }

    protected function casts(): array
    {
        return [
            'opening_cash' => 'decimal:4',
            'expected_cash' => 'decimal:4',
            'counted_cash' => 'decimal:4',
            'variance' => 'decimal:4',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }
}
