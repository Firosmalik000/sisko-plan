<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Platform\RecordAdminAudit;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthenticatedSessionController extends Controller
{
    public function destroy(Request $request, RecordAdminAudit $recordAudit): RedirectResponse
    {
        $admin = $request->user();

        if ($admin instanceof User && $admin->isPlatformAdmin()) {
            $recordAudit->handle($admin, 'admin.logout', null, $request->ip());
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('login');
    }
}
