<?php

namespace App\Models;

use App\Enums\DevicePlatform;
use App\Enums\PushProvider;
use App\Models\Concerns\HasPublicId;
use Database\Factories\DeviceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Registrasi push per-perangkat milik user (design §10, Req 15.1/15.6).
 *
 * @property int $id
 * @property string $public_id
 * @property int $user_id
 * @property string $device_id
 * @property DevicePlatform $platform
 * @property string $push_token
 * @property PushProvider $push_provider
 * @property Carbon|null $last_seen_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable(['user_id', 'device_id', 'platform', 'push_token', 'push_provider', 'last_seen_at'])]
class Device extends Model
{
    /** @use HasFactory<DeviceFactory> */
    use HasFactory, HasPublicId;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'platform' => DevicePlatform::class,
            'push_provider' => PushProvider::class,
            'last_seen_at' => 'datetime',
        ];
    }
}
