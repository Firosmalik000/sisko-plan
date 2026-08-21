<?php

namespace App\Support\Authentication;

use App\Models\User;
use Illuminate\Http\Request;

final class Impersonation
{
    public const SESSION_KEY = 'impersonation';

    /**
     * @return array{
     *     admin_id: int,
     *     admin_name: string,
     *     admin_email: string,
     *     active_store_id: int|null,
     *     started_at: string,
     * }|null
     */
    public static function current(Request $request): ?array
    {
        $impersonation = $request->session()->get(self::SESSION_KEY);

        if (! is_array($impersonation)) {
            return null;
        }

        if (! isset($impersonation['admin_id'], $impersonation['admin_name'], $impersonation['admin_email'], $impersonation['started_at'])) {
            return null;
        }

        return [
            'admin_id' => (int) $impersonation['admin_id'],
            'admin_name' => (string) $impersonation['admin_name'],
            'admin_email' => (string) $impersonation['admin_email'],
            'active_store_id' => array_key_exists('active_store_id', $impersonation) && $impersonation['active_store_id'] !== null
                ? (int) $impersonation['active_store_id']
                : null,
            'started_at' => (string) $impersonation['started_at'],
        ];
    }

    public static function active(Request $request): bool
    {
        return self::current($request) !== null;
    }

    public static function start(Request $request, User $admin): void
    {
        $request->session()->put(self::SESSION_KEY, [
            'admin_id' => $admin->id,
            'admin_name' => $admin->name,
            'admin_email' => $admin->email,
            'active_store_id' => $request->session()->get('active_store_id'),
            'started_at' => now()->toISOString(),
        ]);
    }

    /**
     * @return array{
     *     admin_id: int,
     *     admin_name: string,
     *     admin_email: string,
     *     active_store_id: int|null,
     *     started_at: string,
     * }|null
     */
    public static function stop(Request $request): ?array
    {
        $impersonation = self::current($request);

        if ($impersonation === null) {
            return null;
        }

        $request->session()->forget(self::SESSION_KEY);

        return $impersonation;
    }
}
