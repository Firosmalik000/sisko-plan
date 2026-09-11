<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\SocialTokenException;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Verifikasi Google ID token (JWT) via JWKS resmi Google (server-side, Req 3.1/3.3).
 *
 * Hanya atribut dari token tervalidasi yang dipercaya. aud wajib cocok dengan
 * client_id yang dikonfigurasi; email wajib terverifikasi.
 */
class GoogleTokenVerifier implements SocialTokenVerifier
{
    private const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

    private const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

    public function verify(string $token): SocialCredential
    {
        $clientId = (string) config('services.google.client_id');

        if ($clientId === '') {
            throw new SocialTokenException('Login Google belum dikonfigurasi.');
        }

        try {
            $keys = JWK::parseKeySet($this->fetchCerts());
            $payload = (array) JWT::decode($token, $keys);
        } catch (Throwable $exception) {
            throw new SocialTokenException('Token Google tidak valid.', 0, $exception);
        }

        $issuer = (string) ($payload['iss'] ?? '');
        if (! in_array($issuer, self::ISSUERS, true)) {
            throw new SocialTokenException('Penerbit token Google tidak dikenal.');
        }

        if ((string) ($payload['aud'] ?? '') !== $clientId) {
            throw new SocialTokenException('Audience token Google tidak cocok.');
        }

        $subject = trim((string) ($payload['sub'] ?? ''));
        $email = isset($payload['email']) ? mb_strtolower(trim((string) $payload['email'])) : null;
        $emailVerified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOL);
        $name = isset($payload['name']) ? trim((string) $payload['name']) : null;

        if ($subject === '') {
            throw new SocialTokenException('Token Google tidak memuat subject.');
        }

        return new SocialCredential(
            provider: 'google',
            subject: $subject,
            email: $email !== '' ? $email : null,
            emailVerified: $emailVerified,
            name: $name !== '' ? $name : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchCerts(): array
    {
        $response = Http::acceptJson()->get(self::CERTS_URL);

        if (! $response->successful()) {
            throw new SocialTokenException('Gagal mengambil kunci Google.');
        }

        /** @var array<string, mixed> $json */
        $json = $response->json();

        return $json;
    }
}
