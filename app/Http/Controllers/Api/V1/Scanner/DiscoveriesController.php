<?php

namespace App\Http\Controllers\Api\V1\Scanner;

use App\Exceptions\ScanQuotaExceeded;
use App\Http\Requests\Api\V1\Scanner\DiscoveryRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Services\Intelligence\CatalogIntelligenceClient;
use App\Services\Subscriptions\ScannerQuotaSnapshot;
use App\Services\Subscriptions\ScanQuota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Throwable;

/**
 * POST /stores/{store}/scanner/discoveries — proxy product discovery ke
 * intelligence-service via sisko-plan (design §8, Req 13.4, 14.6).
 *
 * Alur identik recognitions: ability `scan.use` → ensureAvailable →
 * CatalogIntelligenceClient::discover (REUSE) → consume kuota IDEMPOTEN dengan
 * requestKey = `logical_request_id`. Discovery mengembalikan kandidat produk
 * baru (belum ada di katalog), jadi tidak ada hidrasi harga/stok DB; hidrasi
 * harga terjadi saat item hasil recognition/lookup masuk transaksi (Req 13.7).
 * Konsumsi hanya setelah proxy sukses.
 */
class DiscoveriesController
{
    public function __construct(
        private CatalogIntelligenceClient $client,
        private ScanQuota $quota,
        private ScannerQuotaSnapshot $snapshot,
    ) {}

    public function __invoke(DiscoveryRequest $request, Store $store): JsonResponse
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

            $payload = $this->client->discover(
                $store,
                $images,
                (string) $request->validated('market'),
                $requestKey,
            );

            $this->quota->consume($store, $requestKey, 'discover', count($images));
        } catch (ScanQuotaExceeded $exception) {
            return $this->quotaExceeded($exception);
        } catch (Throwable) {
            return $this->serviceUnavailable();
        }

        return ApiResponse::success([
            'discovery' => $payload['data'] ?? [],
            'quota' => $this->snapshot->forStore($store),
        ]);
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
