<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Database\Factories\UserSocialIdentityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $public_id
 * @property int $user_id
 * @property string $provider
 * @property string $provider_subject
 * @property string|null $email
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable(['user_id', 'provider', 'provider_subject', 'email'])]
class UserSocialIdentity extends Model
{
    /** @use HasFactory<UserSocialIdentityFactory> */
    use HasFactory, HasPublicId;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
