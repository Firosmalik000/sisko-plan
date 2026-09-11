<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\SocialTokenException;

/**
 * Kontrak verifikasi credential sosial di sisi server (Req 3.1/3.2/3.3).
 *
 * `$provider` menentukan penyedia (`google`|`apple`). Implementasi konkret
 * memverifikasi signature/aud/exp; test mengikat fake ke container tanpa
 * network call.
 */
interface SocialTokenVerifier
{
    /**
     * @throws SocialTokenException bila token tidak valid.
     */
    public function verify(string $provider, string $token): SocialCredential;
}
