<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\MembershipStatus;
use App\Enums\PlatformAdminRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $google_id
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property UserStatus $status
 * @property PlatformAdminRole|null $platform_role
 * @property Carbon|null $last_login_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property int|null $stores_count
 * @property-read StoreMembership $pivot
 * @property-read Collection<int, Store> $stores
 * @property-read Collection<int, Store> $ownedStores
 * @property-read Subscription|null $subscription
 */
#[Fillable(['name', 'email', 'avatar_path', 'password', 'status', 'platform_role', 'last_login_at'])]
#[Hidden(['avatar_path', 'google_id', 'password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected string $guard_name = 'web';

    protected $appends = ['avatar'];

    /** @return Attribute<string|null, never> */
    protected function avatar(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->avatar_path === null
            ? null
            : route('profile.photo', ['v' => $this->updated_at?->timestamp]));
    }

    /** @return HasMany<Store, $this> */
    public function ownedStores(): HasMany
    {
        return $this->hasMany(Store::class, 'owner_user_id');
    }

    /** @return HasOne<Subscription, $this> */
    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class);
    }

    /** @return HasMany<AdminAuditLog, $this> */
    public function adminAuditLogs(): HasMany
    {
        return $this->hasMany(AdminAuditLog::class);
    }

    public function isPlatformAdmin(): bool
    {
        return $this->platform_role !== null;
    }

    public function canBeImpersonated(): bool
    {
        return $this->status === UserStatus::Active && $this->platform_role === null;
    }

    /** @return BelongsToMany<Store, $this, StoreMembership, 'pivot'> */
    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class)
            ->using(StoreMembership::class)
            ->withPivot(['role', 'status'])
            ->withTimestamps();
    }

    /** @return BelongsToMany<Store, $this, StoreMembership, 'pivot'> */
    public function activeStores(): BelongsToMany
    {
        return $this->stores()->wherePivot('status', MembershipStatus::Active->value);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'status' => UserStatus::class,
            'platform_role' => PlatformAdminRole::class,
            'last_login_at' => 'datetime',
        ];
    }
}
