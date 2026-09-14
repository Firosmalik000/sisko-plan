<?php

namespace App\Observers;

use App\Actions\Referrals\EnsureReferralCode;
use App\Models\User;

class UserObserver
{
    public function created(User $user): void
    {
        app(EnsureReferralCode::class)->handle($user);
    }
}
