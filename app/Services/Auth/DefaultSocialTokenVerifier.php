<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\SocialTokenException;

/**
 * Verifier default yang mendelegasikan ke verifier per-provider (Google/Apple).
 *
 * Titik injeksi tunggal untuk controller; delegasi menjaga verifikasi
 * per-provider tetap terpisah dan teruji tanpa over-abstraction (Req 22).
 */
class DefaultSocialTokenVerifier implements SocialTokenVerifier
{
    public function __construct(
        private GoogleTokenVerifier $google,
        private AppleTokenVerifier $apple,
    ) {}

    public function verify(string $provider, string $token): SocialCredential
    {
        return match ($provider) {
            'google' => $this->google->verify($token),
            'apple' => $this->apple->verify($token),
            default => throw new SocialTokenException('Penyedia identitas tidak didukung.'),
        };
    }
}
