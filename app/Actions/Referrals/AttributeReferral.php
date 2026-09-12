<?php

namespace App\Actions\Referrals;

use App\Models\ReferralAttribution;
use App\Models\ReferralCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttributeReferral
{
    public function handle(User $referred, ReferralCode $code): ReferralAttribution
    {
        return DB::transaction(function () use ($referred, $code): ReferralAttribution {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($referred->id);
            if ($lockedUser->id === $code->user_id) {
                throw ValidationException::withMessages(['referral_code' => __('You cannot refer yourself.')]);
            }

            $existing = ReferralAttribution::query()->where('referred_user_id', $lockedUser->id)->first();
            if ($existing !== null) {
                return $existing;
            }

            return ReferralAttribution::create([
                'referrer_user_id' => $code->user_id,
                'referred_user_id' => $lockedUser->id,
                'referral_code_id' => $code->id,
                'attributed_at' => now(),
            ]);
        }, 3);
    }
}
