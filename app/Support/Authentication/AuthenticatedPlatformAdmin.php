<?php

namespace App\Support\Authentication;

use App\Models\User;
use Illuminate\Http\Request;

final class AuthenticatedPlatformAdmin
{
    public static function get(Request $request): User
    {
        $admin = $request->user();
        abort_unless($admin instanceof User && $admin->isPlatformAdmin(), 401);

        return $admin;
    }

    public static function optional(Request $request): ?User
    {
        $admin = $request->user();

        return $admin instanceof User && $admin->isPlatformAdmin() ? $admin : null;
    }
}
