<?php

namespace App\Support\Logging;

/**
 * Redaktor log terpusat (Req 23.5, Property 32, design §16).
 *
 * Menyamarkan field sensitif dari struktur log terstruktur secara rekursif:
 * token/kredensial, password, byte/base64 foto, dan payload pembayaran penuh.
 * Fungsi murni tanpa efek samping sehingga dapat diuji langsung.
 *
 * Kebijakan:
 * - Kunci sensitif (case-insensitive) diganti dengan penanda `[REDACTED]`.
 * - Nilai binary/base64 gambar diganti `[REDACTED_BINARY]` (tidak pernah bocor byte).
 * - Struktur di-traverse dalam (array/objek) hingga kedalaman aman.
 */
class LogRedactor
{
    public const MASK = '[REDACTED]';

    public const BINARY_MASK = '[REDACTED_BINARY]';

    private const MAX_DEPTH = 8;

    /**
     * Substring kunci yang dianggap sensitif (dicocokkan case-insensitive).
     *
     * @var list<string>
     */
    private const SENSITIVE_KEYS = [
        'token',
        'access_token',
        'refresh_token',
        'id_token',
        'identity_token',
        'plaintextoken',
        'plain_text_token',
        'bearer',
        'authorization',
        'password',
        'secret',
        'api_key',
        'apikey',
        'private_key',
        'photo',
        'image',
        'payment_proof',
        'proof',
        'card_number',
        'cvv',
        'payment_payload',
        'payment',
    ];

    /**
     * Redaksi seluruh konteks log secara rekursif.
     *
     * @param  array<array-key, mixed>  $context
     * @return array<array-key, mixed>
     */
    public static function redact(array $context, int $depth = 0): array
    {
        if ($depth >= self::MAX_DEPTH) {
            return [self::MASK];
        }

        $result = [];

        foreach ($context as $key => $value) {
            if (is_string($key) && self::isSensitiveKey($key)) {
                $result[$key] = self::maskFor($value);

                continue;
            }

            $result[$key] = self::redactValue($value, $depth);
        }

        return $result;
    }

    /**
     * Apakah nama kunci menandakan field sensitif.
     */
    public static function isSensitiveKey(string $key): bool
    {
        $normalized = mb_strtolower($key);

        foreach (self::SENSITIVE_KEYS as $needle) {
            if (str_contains($normalized, $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Redaksi satu nilai (tanpa konteks kunci) — traverse array/objek.
     */
    private static function redactValue(mixed $value, int $depth): mixed
    {
        if (is_array($value)) {
            return self::redact($value, $depth + 1);
        }

        if (is_object($value)) {
            $array = json_decode((string) json_encode($value), true);

            return is_array($array) ? self::redact($array, $depth + 1) : self::MASK;
        }

        return $value;
    }

    /**
     * Penanda yang sesuai untuk nilai sensitif (binary vs teks).
     */
    private static function maskFor(mixed $value): string
    {
        if (is_string($value) && self::looksBinaryOrBase64Image($value)) {
            return self::BINARY_MASK;
        }

        return self::MASK;
    }

    /**
     * Heuristik apakah string berupa byte biner atau data URI/base64 gambar.
     */
    private static function looksBinaryOrBase64Image(string $value): bool
    {
        if (str_starts_with($value, 'data:image')) {
            return true;
        }

        // Byte kontrol non-printable → kemungkinan payload biner (mis. byte foto).
        return (bool) preg_match('/[\x00-\x08\x0E-\x1F]/', $value);
    }
}
