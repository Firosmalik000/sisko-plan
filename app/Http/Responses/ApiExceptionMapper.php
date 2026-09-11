<?php

namespace App\Http\Responses;

use App\Exceptions\Auth\SocialTokenException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

/**
 * Pemetaan exception → envelope error terpusat untuk jalur `/api/v1` (design §13.1).
 *
 * Kode error stabil (tidak boleh berubah tanpa versi API baru):
 * | HTTP | code               | retryable |
 * |------|--------------------|-----------|
 * | 401  | UNAUTHENTICATED    | false     |
 * | 403  | FORBIDDEN          | false     |
 * | 404  | NOT_FOUND          | false     |
 * | 422  | VALIDATION_ERROR   | false     |
 * | 429  | RATE_LIMITED       | true      |
 * | 5xx  | INTERNAL           | true      |
 */
class ApiExceptionMapper
{
    /**
     * Terjemahkan exception menjadi envelope error API.
     *
     * @param  Response  $response  Response terselesaikan Laravel (dipakai sebagai fallback status).
     */
    public static function toEnvelope(Throwable $exception, Response $response): JsonResponse
    {
        if ($exception instanceof SocialTokenException) {
            return ApiResponse::error(
                code: 'UNAUTHENTICATED',
                message: 'Kredensial sosial tidak dapat diverifikasi.',
                retryable: false,
                status: 401,
            );
        }

        if ($exception instanceof ValidationException) {
            return ApiResponse::error(
                code: 'VALIDATION_ERROR',
                message: $exception->getMessage(),
                fields: $exception->errors(),
                retryable: false,
                status: 422,
            );
        }

        if ($exception instanceof AuthenticationException) {
            return ApiResponse::error(
                code: 'UNAUTHENTICATED',
                message: 'Autentikasi diperlukan.',
                retryable: false,
                status: 401,
            );
        }

        if ($exception instanceof AuthorizationException || $exception instanceof AccessDeniedHttpException) {
            return ApiResponse::error(
                code: 'FORBIDDEN',
                message: 'Anda tidak memiliki akses untuk tindakan ini.',
                retryable: false,
                status: 403,
            );
        }

        if ($exception instanceof ModelNotFoundException || $exception instanceof NotFoundHttpException) {
            return ApiResponse::error(
                code: 'NOT_FOUND',
                message: 'Sumber daya tidak ditemukan.',
                retryable: false,
                status: 404,
            );
        }

        if ($exception instanceof TooManyRequestsHttpException) {
            return ApiResponse::error(
                code: 'RATE_LIMITED',
                message: 'Terlalu banyak permintaan. Coba lagi nanti.',
                retryable: true,
                status: 429,
            );
        }

        $status = self::resolveStatus($exception, $response);

        if ($status >= 400 && $status < 500) {
            return ApiResponse::error(
                code: 'INTERNAL',
                message: 'Permintaan tidak dapat diproses.',
                retryable: false,
                status: $status,
            );
        }

        // Server error: jangan bocorkan detail internal.
        return ApiResponse::error(
            code: 'INTERNAL',
            message: 'Terjadi kesalahan pada server.',
            retryable: true,
            status: $status >= 500 ? $status : 500,
        );
    }

    /**
     * Tentukan status HTTP dari exception, fallback ke status response terselesaikan.
     */
    private static function resolveStatus(Throwable $exception, Response $response): int
    {
        if ($exception instanceof HttpExceptionInterface) {
            return $exception->getStatusCode();
        }

        $status = $response->getStatusCode();

        return $status >= 400 ? $status : 500;
    }
}
