<?php

namespace App\Http\Controllers\Api\V1\Scanner;

use App\Actions\Intelligence\RecognizeCatalogItems;
use App\Exceptions\ScanQuotaExceeded;
use App\Http\Requests\Api\V1\Scanner\RecognitionRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Services\Subscriptions\ScannerQuotaSnapshot;
use App\Services\Subscriptions\ScanQuota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Throwable;

/**
 * POST /stores/{store}/scanner/recognitions — proxy recognition ke
 * intelligence-service via sisko-plan (design §8, Req 13.4, 13.7, 14.6).
 *
 * Alur: ability gate `scan.use` → ensureAvailable (kuota) → RecognizeCatalogItems
 * (REUSE — proxy ke CatalogIntelligenceClient lalu hydrate harga/stok/status/
 * permission produk dari DB sisko-plan, JANGAN percaya harga dari intelligence)
 * → consume kuota IDEMPOTEN dengan requestKey = `logical_request_id` (retry
 * tak memotong kuota dua kali, Property 17). Konsumsi hanya SETELAH proxy
 * sukses sehingga service down/timeout tidak memotong kuota.
 *
 * Error: ScanQuotaExceeded → `QUOTA_EXCEEDED` (402, retryable=false); service
 * disabled/timeout/exception → `SERVICE_UNAVAILABLE` (503, retryable=true).
 */
class RecognitionsController
{
    public function __construct(
        private RecognizeCatalogItems $recognizer,
        private ScanQuota $quota,
        private ScannerQuotaSnapshot $snapshot,
    ) {}

    public function __invoke(RecognitionRequest $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('scan.use')) {
            throw new AccessDeniedHttpException('Ability scan.use diperlukan.');
        }

        if (! config('services.catalog_intelligence.enabled')) {
            return $this->serviceUnavailable();
        }

        /** @var array<int, UploadedFile> $images */
        $images = array_values($request->file('images'));
        $requestKey = (string) $request->validated('logical_request_id');

        try {
            $this->quota->ensureAvailable($store, $requestKey, count($images));

            $results = $this->recognizer->handle(
                $store,
                $images,
                $request->validated('capture_ids') ?? [],
                $requestKey,
            );

            // Konsumsi hanya setelah proxy sukses; idempoten via request_key.
            $this->quota->consume($store, $requestKey, 'recognize', count($images));
        } catch (ScanQuotaExceeded $exception) {
            return $this->quotaExceeded($exception);
        } catch (Throwable) {
            return $this->serviceUnavailable();
        }

        return ApiResponse::success([
            'status' => $this->overallStatus($results),
            'candidates' => $results,
            'quota' => $this->snapshot->forStore($store),
        ]);
    }

    /**
     * Status agregat batch: `found` bila ada item found, `uncertain` bila ada
     * kandidat namun tak ada found, `unknown` bila tidak ada kandidat.
     *
     * @param  list<array<string, mixed>>  $results
     */
    private function overallStatus(array $results): string
    {
        $statuses = array_column($results, 'status');

        if (in_array('found', $statuses, true)) {
            return 'found';
        }

        if (in_array('uncertain', $statuses, true)) {
            return 'uncertain';
        }

        return 'unknown';
    }

    private function quotaExceeded(ScanQuotaExceeded $exception): JsonResponse
    {
        return ApiResponse::error(
            code: 'QUOTA_EXCEEDED',
            message: 'Kuota scan foto AI bulan ini sudah habis. Barcode dan entri manual tetap tersedia.',
            fields: ['limit' => $exception->limit, 'used' => $exception->used],
            retryable: false,
            status: 402,
        );
    }

    private function serviceUnavailable(): JsonResponse
    {
        return ApiResponse::error(
            code: 'SERVICE_UNAVAILABLE',
            message: 'Layanan pengenalan sedang tidak tersedia. Coba lagi atau gunakan barcode/pencarian manual.',
            retryable: true,
            status: 503,
        );
    }
}
