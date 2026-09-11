<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Request as RequestFacade;
use Illuminate\Support\Str;

/**
 * Single source of truth for the `/api/v1` response envelope (design §3.1, §13.1).
 *
 * Sukses  : { "data": <mixed>, "meta": { "request_id": "<ulid>" } }
 * Gagal   : { "error": { "code", "message", "fields", "retryable" }, "meta": { "request_id": "<ulid>" } }
 *
 * Envelope tidak pernah mengubah representasi nilai (uang/quantity tetap string decimal).
 */
class ApiResponse
{
    /**
     * Bangun envelope sukses.
     *
     * @param  array<string, mixed>  $meta  Meta tambahan; digabung dengan request_id.
     */
    public static function success(mixed $data, array $meta = [], int $status = 200): JsonResponse
    {
        return new JsonResponse([
            'data' => $data,
            'meta' => self::meta($meta),
        ], $status);
    }

    /**
     * Bangun envelope gagal.
     *
     * @param  array<string, mixed>  $fields  Detail per-field (mis. errors validasi).
     * @param  array<string, mixed>  $meta  Meta tambahan; digabung dengan request_id.
     */
    public static function error(
        string $code,
        string $message,
        array $fields = [],
        bool $retryable = false,
        int $status = 400,
        array $meta = [],
    ): JsonResponse {
        return new JsonResponse([
            'error' => [
                'code' => $code,
                'message' => $message,
                'fields' => (object) $fields,
                'retryable' => $retryable,
            ],
            'meta' => self::meta($meta),
        ], $status);
    }

    /**
     * Rakit blok meta, menyisipkan request_id dari middleware AddRequestId.
     *
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private static function meta(array $meta): array
    {
        return array_merge(['request_id' => self::requestId()], $meta);
    }

    /**
     * Ambil request_id yang disetel middleware AddRequestId; fallback ULID baru
     * bila konteks request tidak tersedia (mis. dipanggil di luar HTTP lifecycle).
     */
    private static function requestId(): string
    {
        $request = RequestFacade::instance();

        $requestId = $request->attributes->get('request_id');

        return is_string($requestId) && $requestId !== ''
            ? $requestId
            : (string) Str::ulid();
    }
}
