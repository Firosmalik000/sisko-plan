<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Platform\RecordAdminAudit;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\Authentication\Impersonation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ImpersonationController extends Controller
{
    public function store(
        Request $request,
        User $user,
        RecordAdminAudit $recordAudit,
    ): RedirectResponse {
        $admin = AuthenticatedPlatformAdmin::get($request);

        abort_unless($user->canBeImpersonated(), 403);
        abort_unless(! Impersonation::active($request), 409);

        DB::transaction(function () use ($admin, $recordAudit, $request, $user): void {
            $recordAudit->handle(
                $admin,
                'admin.impersonation.started',
                $user,
                $request->ip(),
                [
                    'target_user_id' => $user->id,
                    'target_user_email' => $user->email,
                ],
            );
        });

        Auth::login($user);
        Impersonation::start($request, $admin);
        $request->session()->forget('active_store_id');
        $request->session()->regenerate();
        $request->session()->regenerateToken();

        return to_route('dashboard');
    }

    public function destroy(Request $request, RecordAdminAudit $recordAudit): RedirectResponse
    {
        $impersonation = Impersonation::stop($request);

        abort_unless($impersonation !== null, 403);

        $admin = User::query()->findOrFail($impersonation['admin_id']);
        $currentUser = $request->user();

        DB::transaction(function () use ($admin, $currentUser, $impersonation, $recordAudit, $request): void {
            $recordAudit->handle(
                $admin,
                'admin.impersonation.ended',
                $currentUser instanceof User ? $currentUser : null,
                $request->ip(),
                [
                    'started_at' => $impersonation['started_at'],
                    'target_user_id' => $currentUser instanceof User ? $currentUser->id : null,
                ],
            );
        });

        Auth::login($admin);
        $request->session()->put('active_store_id', $impersonation['active_store_id']);
        $request->session()->regenerate();
        $request->session()->regenerateToken();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Mode impersonasi dihentikan.',
        ]);

        return to_route('super-admin.users.index');
    }
}
