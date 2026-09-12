<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET/PATCH /me/notification-preferences — preferensi kategori notifikasi
 * per-pengguna (Req 29.1, 29.3).
 *
 * Operational & security selalu aktif dan tidak dapat dimatikan; hanya promo
 * yang dapat dimatikan pengguna (Req 29.2). Preferensi diterapkan pada
 * pengiriman berikutnya.
 */
class NotificationPreferenceController
{
    /**
     * Default: seluruh kategori aktif.
     *
     * @var array<string, bool>
     */
    private const DEFAULTS = [
        'operational' => true,
        'promo' => true,
        'security' => true,
    ];

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'notification_preferences' => $this->resolve($request),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'promo' => ['required', 'boolean'],
        ]);

        $user = $request->user();
        $prefs = $this->resolve($request);

        // Operational & security terkunci ON; hanya promo yang dapat diubah.
        $prefs['promo'] = (bool) $validated['promo'];
        $prefs['operational'] = true;
        $prefs['security'] = true;

        $user->notification_preferences = $prefs;
        $user->save();

        return ApiResponse::success([
            'notification_preferences' => $prefs,
        ]);
    }

    /**
     * @return array<string, bool>
     */
    private function resolve(Request $request): array
    {
        $stored = $request->user()->notification_preferences;

        if (! is_array($stored)) {
            return self::DEFAULTS;
        }

        return [
            'operational' => true,
            'promo' => (bool) ($stored['promo'] ?? true),
            'security' => true,
        ];
    }
}
