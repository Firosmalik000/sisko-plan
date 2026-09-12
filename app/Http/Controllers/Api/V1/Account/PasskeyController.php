<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passkeys\Actions\DeletePasskey;
use Laravel\Passkeys\Actions\GenerateRegistrationOptions;
use Laravel\Passkeys\Passkey;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Kelola passkey (WebAuthn) untuk Api/V1 (Req 26.4). REUSE paket `laravel/passkeys`
 * (relasi `User::passkeys()`, action Generate/Delete). `index` menampilkan daftar,
 * `options` menghasilkan opsi registrasi WebAuthn (challenge dsb) untuk dijalankan
 * di perangkat, `destroy` menghapus passkey.
 *
 * CATATAN: penyelesaian ceremony registrasi (attestation) bersifat device-dependent
 * — memerlukan authenticator nyata (Touch ID/Windows Hello/YubiKey) pada perangkat;
 * klien menjalankan ceremony dengan `options` lalu mengirim attestation ke endpoint
 * web/paket. List & hapus tersedia penuh via API.
 */
class PasskeyController
{
    public function index(Request $request): JsonResponse
    {
        $passkeys = $request->user()->passkeys()->latest()->get();

        return ApiResponse::success([
            'passkeys' => $passkeys->map(fn (Passkey $passkey): array => [
                'id' => $passkey->id,
                'name' => $passkey->name,
                'authenticator' => $passkey->authenticator,
                'created_at' => $passkey->created_at?->toIso8601String(),
                'last_used_at' => $passkey->last_used_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    public function options(Request $request, GenerateRegistrationOptions $generate): JsonResponse
    {
        $options = $generate($request->user());

        return ApiResponse::success([
            'registration_options' => json_decode(json_encode($options), true),
        ]);
    }

    public function destroy(Request $request, DeletePasskey $delete, Passkey $passkey): JsonResponse
    {
        // Tenant/ownership: passkey harus milik pengguna aktif.
        if ((int) $passkey->user_id !== (int) $request->user()->getKey()) {
            throw new NotFoundHttpException('Passkey tidak ditemukan.');
        }

        $delete($request->user(), $passkey);

        return ApiResponse::success(['deleted' => true]);
    }
}
