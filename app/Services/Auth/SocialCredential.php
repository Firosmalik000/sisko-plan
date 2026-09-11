<?php

namespace App\Services\Auth;

/**
 * Atribut identitas sosial yang diverifikasi server-side.
 *
 * Hanya nilai di objek ini yang boleh dipercaya; email/nama mentah dari
 * client tidak pernah dijadikan bukti identitas (Req 3.3).
 */
final class SocialCredential
{
    public function __construct(
        public readonly string $provider,
        public readonly string $subject,
        public readonly ?string $email,
        public readonly bool $emailVerified,
        public readonly ?string $name,
    ) {}
}
