<?php

namespace App\Http\Responses;

use App\Actions\Platform\RecordAdminAudit;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): JsonResponse|RedirectResponse
    {
        if ($request->wantsJson()) {
            return response()->json(['two_factor' => false]);
        }

        $user = $request->user();
        if ($user instanceof User && $user->isPlatformAdmin()) {
            $user->forceFill(['last_login_at' => now()])->save();
            app(RecordAdminAudit::class)->handle($user, 'admin.login', null, $request->ip(), ['two_factor' => false]);
        }
        $destination = $user instanceof User && $user->isPlatformAdmin()
            ? route('super-admin.dashboard')
            : route('dashboard');

        return redirect()->intended($destination);
    }
}
