<?php

namespace App\Models;

use App\Enums\PlatformAdminRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
 */
#[Fillable(['name', 'email', 'avatar_path', 'password', 'status', 'platform_role', 'last_login_at'])]
#[Hidden(['avatar_path', 'google_id', 'password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected string $guard_name = 'web';

    protected $appends = ['avatar'];

    /** @return Attribute<covariant string|null, never> */
    protected function avatar(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->avatar_path === null
            ? null
            : route('profile.photo', ['v' => $this->updated_at?->timestamp]));
    }

    /** @return HasMany<BusinessMembership, $this> */
    public function businessMemberships(): HasMany
    {
        return $this->hasMany(BusinessMembership::class);
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
