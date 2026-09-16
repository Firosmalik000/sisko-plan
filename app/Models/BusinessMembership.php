<?php

namespace App\Models;

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use Database\Factories\BusinessMembershipFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $public_id
 * @property int $business_id
 * @property int|null $user_id
 * @property string $display_name
 * @property BusinessRole $business_role
 * @property MembershipStatus $status
 * @property string|null $pos_pin_hash
 * @property Carbon|null $pin_changed_at
 * @property Carbon|null $invited_at
 * @property Carbon|null $joined_at
 * @property-read Business $business
 * @property-read User|null $user
 */
#[Fillable(['business_id', 'user_id', 'display_name', 'business_role', 'status', 'pos_pin_hash', 'pin_changed_at', 'invited_at', 'joined_at'])]
#[Hidden(['pos_pin_hash'])]
class BusinessMembership extends Model
{
    /** @use HasFactory<BusinessMembershipFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (BusinessMembership $membership): void {
            $membership->public_id ??= (string) Str::ulid();
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

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsToMany<Store, $this, StoreMembership, 'pivot'> */
    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class, 'store_memberships')
            ->using(StoreMembership::class)
            ->withPivot(['role', 'status'])
            ->withTimestamps();
    }

    public static function operational(Store|int $store, self|User $actor): self
    {
        $businessId = $store instanceof Store
            ? $store->business_id
            : Store::query()->whereKey($store)->valueOrFail('business_id');
        $membership = $actor instanceof self
            ? $actor
            : self::query()->where('business_id', $businessId)->where('user_id', $actor->id)->firstOrFail();

        abort_unless($membership->business_id === $businessId && $membership->status === MembershipStatus::Active, 403);

        return $membership;
    }

    protected function casts(): array
    {
        return [
            'business_role' => BusinessRole::class,
            'status' => MembershipStatus::class,
            'pin_changed_at' => 'datetime',
            'invited_at' => 'datetime',
            'joined_at' => 'datetime',
        ];
    }
}
