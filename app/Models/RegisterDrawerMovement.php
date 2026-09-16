<?php

namespace App\Models;

use App\Models\Concerns\ImmutableLedgerRecord;
use Database\Factories\RegisterDrawerMovementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['store_id', 'register_session_id', 'direction', 'amount', 'reason', 'actor_business_membership_id', 'approval_id', 'reversal_of_movement_id', 'occurred_at'])]
class RegisterDrawerMovement extends Model
{
    /** @use HasFactory<RegisterDrawerMovementFactory> */
    use HasFactory, ImmutableLedgerRecord;

    protected static function booted(): void
    {
        static::creating(fn (RegisterDrawerMovement $movement) => $movement->public_id ??= (string) Str::ulid());
    }

    /** @return BelongsTo<RegisterSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(RegisterSession::class, 'register_session_id');
    }

    protected function casts(): array
    {
        return ['amount' => 'decimal:4', 'occurred_at' => 'datetime'];
    }
}
