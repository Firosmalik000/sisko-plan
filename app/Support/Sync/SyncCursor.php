<?php

namespace App\Support\Sync;

use Carbon\CarbonImmutable;

/**
 * Cursor sinkronisasi delta untuk Api_V1 (design §5.3, Req 7.1).
 *
 * Cursor adalah gabungan high-water-mark `updated_at` per-stream (mis.
 * `product_units`, `financial_accounts`). Direpresentasikan sebagai peta
 * `{ stream: iso8601 }` lalu di-encode base64url(JSON) agar aman dibawa di
 * query string. Cursor bergerak monoton maju; pull dengan cursor lama
 * mengembalikan hanya baris dengan `updated_at` lebih baru (strict `>`),
 * sehingga re-apply cursor yang sama = no-op (idempotent).
 */
final class SyncCursor
{
    /**
     * @param  array<string, CarbonImmutable>  $watermarks  Peta stream → high-water-mark.
     */
    public function __construct(private array $watermarks = []) {}

    /**
     * Decode cursor dari string query. Cursor kosong/invalid diperlakukan sebagai
     * "awal waktu" (tidak ada watermark) sehingga seluruh baris ikut sebagai delta.
     */
    public static function decode(?string $encoded): self
    {
        if ($encoded === null || $encoded === '') {
            return new self;
        }

        $json = base64_decode(strtr($encoded, '-_', '+/'), true);

        if ($json === false) {
            return new self;
        }

        $decoded = json_decode($json, true);

        if (! is_array($decoded)) {
            return new self;
        }

        $watermarks = [];

        foreach ($decoded as $stream => $timestamp) {
            if (! is_string($stream) || ! is_string($timestamp)) {
                continue;
            }

            $parsed = self::tryParse($timestamp);

            if ($parsed !== null) {
                $watermarks[$stream] = $parsed;
            }
        }

        return new self($watermarks);
    }

    /**
     * High-water-mark untuk sebuah stream, atau null bila belum pernah disinkronkan.
     */
    public function watermarkFor(string $stream): ?CarbonImmutable
    {
        return $this->watermarks[$stream] ?? null;
    }

    /**
     * Kembalikan cursor baru dengan watermark stream diperbarui ke nilai terbaru.
     * Watermark hanya bergerak maju (monoton) — nilai lebih lama diabaikan.
     */
    public function advance(string $stream, ?CarbonImmutable $candidate): self
    {
        if ($candidate === null) {
            return $this;
        }

        $current = $this->watermarks[$stream] ?? null;

        if ($current !== null && $candidate->lessThanOrEqualTo($current)) {
            return $this;
        }

        $watermarks = $this->watermarks;
        $watermarks[$stream] = $candidate;

        return new self($watermarks);
    }

    /**
     * Encode cursor menjadi string base64url(JSON) yang aman untuk query string.
     */
    public function encode(): string
    {
        $payload = [];

        foreach ($this->watermarks as $stream => $timestamp) {
            $payload[$stream] = $timestamp->toIso8601ZuluString();
        }

        ksort($payload);

        $json = json_encode($payload, JSON_THROW_ON_ERROR);

        return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    }

    private static function tryParse(string $timestamp): ?CarbonImmutable
    {
        try {
            return CarbonImmutable::parse($timestamp);
        } catch (\Throwable) {
            return null;
        }
    }
}
