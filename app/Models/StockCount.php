<?php

namespace App\Models;

use App\Enums\StockCountStatus;
use App\Models\Concerns\HasPublicId;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $public_id
 * @property int $store_id
 * @property string $document_number
 * @property StockCountStatus $status
 * @property CarbonImmutable $snapshot_at
 * @property CarbonImmutable|null $completed_at
 * @property CarbonImmutable|null $posted_at
 * @property CarbonImmutable|null $cancelled_at
 * @property string|null $notes
 * @property int $created_by_user_id
 * @property int|null $completed_by_user_id
 * @property int|null $posted_by_user_id
 * @property int|null $cancelled_by_user_id
 * @property int $items_count
 * @property int $counted_items_count
 * @property int $discrepancy_items_count
 * @property-read User|null $creator
 * @property-read User|null $completer
 * @property-read User|null $poster
 */
#[Fillable([
    'store_id', 'document_number', 'status', 'snapshot_at', 'completed_at', 'posted_at',
    'cancelled_at', 'notes', 'created_by_user_id', 'completed_by_user_id',
    'posted_by_user_id', 'cancelled_by_user_id',
])]
class StockCount extends Model
{
    use HasPublicId;

    /** @return HasMany<StockCountItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(StockCountItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by_user_id');
    }

    protected function casts(): array
    {
        return [
            'status' => StockCountStatus::class,
            'snapshot_at' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
            'posted_at' => 'immutable_datetime',
            'cancelled_at' => 'immutable_datetime',
        ];
    }
}
