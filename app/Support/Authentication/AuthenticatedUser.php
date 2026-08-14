<?php

namespace App\Support\Authentication;

use App\Models\User;
use Illuminate\Http\Request;

final class AuthenticatedUser
{
    public static function get(Request $request): User
    {
        $user = $request->user('web');
        abort_unless($user instanceof User, 401);

        return $user;
    }

    public static function optional(Request $request): ?User
    {
        $user = $request->user('web');

        return $user instanceof User ? $user : null;
    }
}
