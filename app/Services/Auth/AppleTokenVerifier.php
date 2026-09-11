<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\SocialTokenException;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Verifikasi Apple identity token (JWT) via JWKS resmi Apple (server-side, Req 3.2/3.3).
 *
 * iss wajib https://appleid.apple.com\; aud wajib salah satu client_id (bundle id)
 * yang dikonfigurasi. Sign in with Apple mengirim email hanya pada login pertama.
 */
class AppleTokenVerifier implements SocialTokenVerifier
{
    private const CERTS_URL = 'https://appleid.apple.com/auth/keys';

    private const ISSUER = 'https://appleid.apple.com';

    public function verify(string $token): SocialCredential
    {
        /** @var list<string> $clientIds */
        $clientIds = (array) config('services.apple.client_ids', []);

        if ($clientIds === []) {
            throw new SocialTokenException('Login Apple belum dikonfigurasi.');
        }

        try {
            $keys = JWK::parseKeySet($this->fetchCerts());
            $payload = (array) JWT::decode($token, $keys);
        } catch (Throwable $exception) {
            throw new SocialTokenException('Token Apple tidak valid.', 0, $exception);
        }

        if ((string) ($payload['iss'] ?? '') !== self::ISSUER) {
            throw new SocialTokenException('Penerbit token Apple tidak dikenal.');
        }

        if (! in_array((string) ($payload['aud'] ?? ''), $clientIds, true)) {
            throw new SocialTokenException('Audience token Apple tidak cocok.');
        }

        $subject = trim((string) ($payload['sub'] ?? ''));
        $email = isset($payload['email']) ? mb_strtolower(trim((string) $payload['email'])) : null;
        $emailVerified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOL);

        if ($subject === '') {
            throw new SocialTokenException('Token Apple tidak memuat subject.');
        }

        return new SocialCredential(
            provider: 'apple',
            subject: $subject,
            email: $email !== '' ? $email : null,
            emailVerified: $emailVerified,
            name: null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchCerts(): array
    {
        $response = Http::acceptJson()->get(self::CERTS_URL);

        if (! $response->successful()) {
            throw new SocialTokenException('Gagal mengambil kunci Apple.');
        }

        /** @var array<string, mixed> $json */
        $json = $response->json();

        return $json;
    }
}
