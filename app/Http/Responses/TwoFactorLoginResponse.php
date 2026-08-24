<?php

namespace App\Http\Responses;

use App\Actions\Platform\RecordAdminAudit;
use App\Models\User;
use App\Support\PlatformPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\TwoFactorLoginResponse as TwoFactorLoginResponseContract;

class TwoFactorLoginResponse implements TwoFactorLoginResponseContract
{
    public function toResponse($request): JsonResponse|RedirectResponse
    {
        if ($request->wantsJson()) {
            return response()->json(['two_factor' => true]);
        }

        $user = $request->user();
        if ($user instanceof User && $user->isPlatformAdmin()) {
            $user->forceFill(['last_login_at' => now()])->save();
            app(RecordAdminAudit::class)->handle($user, 'admin.login', null, $request->ip(), ['two_factor' => true]);
        }
        $destination = $user instanceof User && $user->isPlatformAdmin()
            ? route(PlatformPermission::landingRoute($user))
            : route('dashboard');

        return redirect()->intended($destination);
    }
}
