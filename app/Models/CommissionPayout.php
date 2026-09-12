<?php

namespace App\Models;

use App\Enums\CommissionPayoutStatus;
use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $public_id
 * @property int $referrer_user_id
 * @property string $total_amount
 * @property CommissionPayoutStatus $status
 * @property string|null $reference
 * @property string|null $notes
 * @property int $created_by_user_id
 * @property int|null $paid_by_user_id
 * @property Carbon|null $paid_at
 * @property-read User $referrer
 * @property-read User $creator
 * @property-read User|null $paidBy
 * @property-read Collection<int, CommissionPayoutItem> $items
 */
#[Fillable(['referrer_user_id', 'total_amount', 'status', 'reference', 'notes', 'created_by_user_id', 'paid_by_user_id', 'paid_at'])]
class CommissionPayout extends Model
{
    use HasPublicId;

    /** @return BelongsTo<User, $this> */
    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by_user_id');
    }

    /** @return HasMany<CommissionPayoutItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(CommissionPayoutItem::class);
    }

    protected static function booted(): void
    {
        static::deleting(fn () => throw new \LogicException('Payout records cannot be deleted.'));
    }

    protected function casts(): array
    {
        return ['total_amount' => 'decimal:4', 'status' => CommissionPayoutStatus::class, 'paid_at' => 'datetime'];
    }
}
