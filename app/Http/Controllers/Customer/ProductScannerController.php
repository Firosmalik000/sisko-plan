<?php

namespace App\Http\Controllers\Customer;

use App\Actions\Intelligence\RecognizeCatalogItems;
use App\Exceptions\ScanQuotaExceeded;
use App\Http\Controllers\Controller;
use App\Http\Requests\Scanner\DiscoverCatalogItemRequest;
use App\Http\Requests\Scanner\LookupCatalogItemRequest;
use App\Http\Requests\Scanner\RecognizeCatalogItemsRequest;
use App\Models\ProductUnit;
use App\Services\Intelligence\CatalogIntelligenceClient;
use App\Services\Subscriptions\ScanQuota;
use App\Support\CurrentStore;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Throwable;

class ProductScannerController extends Controller
{
    public function lookup(LookupCatalogItemRequest $request, CurrentStore $currentStore, RecognizeCatalogItems $recognizer): JsonResponse
    {
        $type = $request->validated('type');
        $unit = ProductUnit::query()
            ->where('store_id', $currentStore->id())
            ->where($type, trim($request->validated('identifier')))
            ->where('is_active', true)
            ->whereHas('product', fn ($query) => $query->where('is_active', true))
            ->whereHas('unit', fn ($query) => $query->where('is_active', true))
            ->where(fn ($query) => $query->whereNull('product_variant_id')->orWhereHas('productVariant', fn ($variant) => $variant->where('is_active', true)))
            ->with(['product', 'productVariant', 'unit'])
            ->first();

        if ($unit === null) {
            return response()->json(['status' => 'success', 'data' => [[
                'captureId' => $request->validated('capture_id') ?? 'identifier',
                'imageIndex' => 0,
                'itemIndex' => 0,
                'status' => 'unknown',
                'match' => null,
                'selectedOption' => null,
                'candidates' => [],
            ]]]);
        }

        return response()->json(['status' => 'success', 'data' => [
            $recognizer->serializeProductUnit($unit, $type, $request->validated('capture_id') ?? 'identifier'),
        ]]);
    }

    public function recognize(RecognizeCatalogItemsRequest $request, CurrentStore $currentStore, RecognizeCatalogItems $recognizer, ScanQuota $quota): JsonResponse
    {
        if (! config('services.catalog_intelligence.enabled')) {
            return $this->notConfigured($request);
        }

        try {
            $images = $request->file('images');
            abort_unless(is_array($images), 422);
            $requestKey = $this->imageRequestKey($request, $currentStore, 'recognize', $images);
            $quota->ensureAvailable($currentStore->get(), $requestKey, count($images));
            $data = $recognizer->handle(
                $currentStore->get(),
                array_values($images),
                $request->validated('capture_ids') ?? [],
                $this->requestId($request),
            );

            // Distinct requests can race for the final credit; do not return uncharged results.
            $quota->consume($currentStore->get(), $requestKey, 'recognize', count($images));

            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (ScanQuotaExceeded $exception) {
            return $this->quotaExceeded($request, $exception);
        } catch (Throwable $exception) {
            return $this->failure($request, $exception);
        }
    }

    public function discover(DiscoverCatalogItemRequest $request, CurrentStore $currentStore, CatalogIntelligenceClient $client, ScanQuota $quota): JsonResponse
    {
        if (! config('services.catalog_intelligence.enabled')) {
            return $this->notConfigured($request);
        }

        try {
            $images = $request->file('images');
            abort_unless(is_array($images), 422);
            $requestKey = $this->imageRequestKey($request, $currentStore, 'discover', $images);
            $quota->ensureAvailable($currentStore->get(), $requestKey, count($images));

            $data = $client->discover(
                $currentStore->get(),
                array_values($images),
                $request->validated('market'),
                $request->validated('scan_request_id'),
            );
            $quota->consume($currentStore->get(), $requestKey, 'discover', count($images));

            return response()->json($data);
        } catch (ScanQuotaExceeded $exception) {
            return $this->quotaExceeded($request, $exception);
        } catch (Throwable $exception) {
            return $this->failure($request, $exception);
        }
    }

    private function notConfigured(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'code' => 'SCANNER_NOT_CONNECTED',
            'retryable' => false,
            'message' => __('Scanner service is not connected. Contact the administrator.'),
            'request_id' => $this->requestId($request),
        ], 503);
    }

    private function failure(Request $request, Throwable $exception): JsonResponse
    {
        $upstreamStatus = $exception instanceof RequestException ? $exception->response->status() : null;
        $upstreamCode = $exception instanceof RequestException ? $exception->response->json('data.code') : null;
        $retryable = $upstreamStatus === 429 && in_array($upstreamCode, ['SERVICE_BUSY', 'DISCOVERY_BUSY'], true);
        if ($retryable) {
            [$status, $code, $message] = [429, 'SCANNER_BUSY', __('Scanner is busy. Try again shortly.')];
        } elseif ($upstreamStatus === 429) {
            $code = in_array($upstreamCode, ['DISCOVERY_QUOTA_EXCEEDED', 'DISCOVERY_SPEND_LIMIT_EXCEEDED'], true)
                ? $upstreamCode : 'SCANNER_RATE_LIMITED';
            [$status, $message] = [429, __('Recognition is unavailable. Try again or search manually.')];
        } elseif (in_array($upstreamStatus, [401, 403], true)) {
            [$status, $code, $message] = [503, 'SCANNER_NOT_CONNECTED', __('Scanner service is not connected. Contact the administrator.')];
        } else {
            [$status, $code, $message] = [503, 'SCANNER_UNAVAILABLE', __('Recognition is unavailable. Try again or search manually.')];
        }

        return response()->json([
            'status' => 'error',
            'code' => $code,
            'retryable' => $retryable || ($upstreamStatus === 503 && $upstreamCode === 'DISCOVERY_UNAVAILABLE'),
            'message' => $message,
            'request_id' => $this->requestId($request),
        ], $status);
    }

    private function quotaExceeded(Request $request, ScanQuotaExceeded $exception): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'code' => 'SCAN_LIMIT_REACHED',
            'retryable' => false,
            'message' => __('Kuota :limit scan foto AI bulan ini sudah habis. Barcode tetap bisa digunakan.', [
                'limit' => $exception->limit,
            ]),
            'used' => $exception->used,
            'limit' => $exception->limit,
            'request_id' => $this->requestId($request),
        ], 429);
    }

    /** @param array<UploadedFile> $images */
    private function imageRequestKey(Request $request, CurrentStore $store, string $operation, array $images): string
    {
        return hash('sha256', json_encode([
            $request->user()?->id,
            $store->id(),
            $operation,
            $request->input('scan_request_id'),
            $request->input('purpose'),
            $request->input('market'),
            $request->input('language'),
            $request->input('currency'),
            array_map(fn (UploadedFile $image): string => hash('sha256', $image->getContent()), $images),
        ], JSON_THROW_ON_ERROR));
    }

    private function requestId(Request $request): string
    {
        return (string) $request->attributes->get('request_id', str()->uuid());
    }
}
