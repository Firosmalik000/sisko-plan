<?php

namespace App\Actions\Referrals;

use App\Models\ReferralCode;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Str;

class EnsureReferralCode
{
    public function handle(User $user): ReferralCode
    {
        if (($existing = $user->referralCode()->first()) !== null) {
            return $existing;
        }

        for ($attempt = 0; $attempt < 8; $attempt++) {
            try {
                return ReferralCode::create(['user_id' => $user->id, 'code' => Str::upper(Str::random(10))]);
            } catch (UniqueConstraintViolationException) {
                continue;
            }
        }

        return ReferralCode::query()->where('user_id', $user->id)->firstOrFail();
    }
}
