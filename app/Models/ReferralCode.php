<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $public_id
 * @property int $user_id
 * @property string $code
 * @property-read User $user
 * @property-read Collection<int, ReferralAttribution> $attributions
 */
#[Fillable(['user_id', 'code'])]
class ReferralCode extends Model
{
    use HasPublicId;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<ReferralAttribution, $this> */
    public function attributions(): HasMany
    {
        return $this->hasMany(ReferralAttribution::class);
    }
}
