<?php

namespace App\Models;

use App\Enums\NotificationCategory;
use App\Models\Concerns\HasPublicId;
use Database\Factories\MobileNotificationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Notification center store-scoped untuk app mobile (design §10, Req 15.2).
 *
 * Terpisah dari tabel `notifications` bawaan Laravel (StockAlert dsb.) agar
 * concern mobile terisolasi. `category` menentukan channel push (Req 15.3).
 *
 * @property int $id
 * @property string $public_id
 * @property int $store_id
 * @property int|null $user_id
 * @property NotificationCategory $category
 * @property string $title
 * @property string $body
 * @property Carbon|null $read_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Store $store
 * @property-read User|null $user
 */
#[Fillable(['store_id', 'user_id', 'category', 'title', 'body', 'read_at'])]
class MobileNotification extends Model
{
    /** @use HasFactory<MobileNotificationFactory> */
    use HasFactory, HasPublicId;

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'category' => NotificationCategory::class,
            'read_at' => 'datetime',
        ];
    }
}
