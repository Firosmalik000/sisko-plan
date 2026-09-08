<?php

namespace App\Http\Controllers\Customer;

use App\Actions\Intelligence\RecognizeCatalogItems;
use App\Exceptions\ScanQuotaExceeded;
use App\Http\Controllers\Controller;
use App\Http\Requests\Scanner\ConsumeScannerUsageRequest;
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
use Illuminate\Support\Str;
use Throwable;

class ProductScannerController extends Controller
{
    public function consume(ConsumeScannerUsageRequest $request, CurrentStore $currentStore, ScanQuota $quota): JsonResponse
    {
        try {
            $quota->consume($currentStore->get(), $this->scanRequestKey(), 'barcode');
        } catch (ScanQuotaExceeded $exception) {
            return $this->quotaExceeded($request, $exception);
        }

        return response()->json(['status' => 'success']);
    }

    public function lookup(LookupCatalogItemRequest $request, CurrentStore $currentStore, RecognizeCatalogItems $recognizer, ScanQuota $quota): JsonResponse
    {
        try {
            $quota->consume($currentStore->get(), $this->scanRequestKey(), 'lookup');
        } catch (ScanQuotaExceeded $exception) {
            return $this->quotaExceeded($request, $exception);
        }

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
            $quota->consume($currentStore->get(), $this->scanRequestKey(), 'recognize', count($images));
            $data = $recognizer->handle(
                $currentStore->get(),
                array_values($images),
                $request->validated('capture_ids') ?? [],
                $this->requestId($request),
            );

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
            $quota->consume($currentStore->get(), $this->scanRequestKey(), 'discover', count($images));

            return response()->json($client->discover(
                $currentStore->get(),
                array_values($images),
                $request->validated('market'),
                $this->requestId($request),
            ));
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
            'message' => __('Scanner service is not connected. Contact the administrator.'),
            'request_id' => $this->requestId($request),
        ], 503);
    }

    private function failure(Request $request, Throwable $exception): JsonResponse
    {
        $upstreamStatus = $exception instanceof RequestException ? $exception->response->status() : null;
        if ($upstreamStatus === 429) {
            [$status, $code, $message] = [429, 'SCANNER_BUSY', __('Scanner is busy. Try again shortly.')];
        } elseif (in_array($upstreamStatus, [401, 403], true)) {
            [$status, $code, $message] = [503, 'SCANNER_NOT_CONNECTED', __('Scanner service is not connected. Contact the administrator.')];
        } else {
            [$status, $code, $message] = [503, 'SCANNER_UNAVAILABLE', __('Recognition is unavailable. Try again or search manually.')];
        }

        return response()->json([
            'status' => 'error',
            'code' => $code,
            'message' => $message,
            'request_id' => $this->requestId($request),
        ], $status);
    }

    private function quotaExceeded(Request $request, ScanQuotaExceeded $exception): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'code' => 'SCAN_LIMIT_REACHED',
            'message' => __('Kuota :limit scan bulan ini sudah habis. Tambahkan kapasitas scan untuk melanjutkan.', [
                'limit' => $exception->limit,
            ]),
            'used' => $exception->used,
            'limit' => $exception->limit,
            'request_id' => $this->requestId($request),
        ], 429);
    }

    private function scanRequestKey(): string
    {
        return (string) Str::ulid();
    }

    private function requestId(Request $request): string
    {
        return (string) $request->attributes->get('request_id', str()->uuid());
    }
}
