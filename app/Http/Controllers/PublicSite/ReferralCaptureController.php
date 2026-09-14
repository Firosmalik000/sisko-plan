<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Models\ReferralCode;
use App\Support\Referrals\ReferralIntent;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\RedirectResponse;

class ReferralCaptureController extends Controller
{
    public function __invoke(Request $request, string $code, ReferralIntent $intent): RedirectResponse
    {
        if ($request->user() !== null) {
            return to_route('referral.index');
        }

        $referralCode = ReferralCode::query()->where('code', Str::upper($code))->firstOrFail();
        $intent->remember($request, $referralCode);

        return to_route('register');
    }
}
