<?php

namespace App\Actions\Fortify;

use App\Actions\Referrals\AttributeReferral;
use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\ReferralCode;
use App\Models\User;
use App\Support\Referrals\ReferralIntent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    public function __construct(
        private StartDefaultSubscription $subscriptions,
        private AttributeReferral $attributeReferral,
        private ReferralIntent $referralIntent,
        private Request $request,
    ) {}

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        $pendingCode = $this->referralIntent->resolve($this->request);
        $user = DB::transaction(function () use ($input, $pendingCode): User {
            $user = User::create([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
            ]);
            $this->subscriptions->handle($user);
            $referralCode = $pendingCode === null ? null : ReferralCode::query()->find($pendingCode->id);
            if ($referralCode !== null) {
                try {
                    $this->attributeReferral->handle($user, $referralCode);
                } catch (ValidationException) {
                    // Stale marketing intent must not prevent a valid registration.
                }
            }

            return $user;
        });

        if ($pendingCode !== null) {
            $this->referralIntent->forget($this->request);
        }

        return $user;
    }
}
