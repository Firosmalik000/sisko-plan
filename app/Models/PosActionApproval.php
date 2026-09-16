<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property Carbon $expires_at
 * @property Carbon|null $used_at
 */
#[Fillable(['store_id', 'pos_device_id', 'cashier_business_membership_id', 'approver_business_membership_id', 'action', 'target_type', 'target_id', 'expires_at', 'used_at'])]
class PosActionApproval extends Model
{
    protected static function booted(): void
    {
        static::creating(fn (PosActionApproval $approval) => $approval->public_id ??= (string) Str::ulid());
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'used_at' => 'datetime'];
    }
}
