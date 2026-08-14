<?php

namespace App\Support\Authentication;

use App\Models\PlatformAdmin;
use Illuminate\Http\Request;

final class AuthenticatedPlatformAdmin
{
    public static function get(Request $request): PlatformAdmin
    {
        $admin = $request->user('platform_admin');
        abort_unless($admin instanceof PlatformAdmin, 401);

        return $admin;
    }

    public static function optional(Request $request): ?PlatformAdmin
    {
        $admin = $request->user('platform_admin');

        return $admin instanceof PlatformAdmin ? $admin : null;
    }
}
