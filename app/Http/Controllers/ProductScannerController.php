<?php

namespace App\Http\Controllers;

use App\Actions\Intelligence\RecognizeCatalogItems;
use App\Http\Requests\Scanner\DiscoverCatalogItemRequest;
use App\Http\Requests\Scanner\LookupCatalogItemRequest;
use App\Http\Requests\Scanner\RecognizeCatalogItemsRequest;
use App\Models\ProductUnit;
use App\Services\Intelligence\CatalogIntelligenceClient;
use App\Support\CurrentStore;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    public function recognize(RecognizeCatalogItemsRequest $request, CurrentStore $currentStore, RecognizeCatalogItems $recognizer): JsonResponse
    {
        if (! config('services.catalog_intelligence.enabled')) {
            return $this->notConfigured($request);
        }

        try {
            $data = $recognizer->handle(
                $currentStore->get(),
                $request->file('images'),
                $request->validated('capture_ids') ?? [],
                $this->requestId($request),
            );

            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $exception) {
            return $this->failure($request, $exception);
        }
    }

    public function discover(DiscoverCatalogItemRequest $request, CurrentStore $currentStore, CatalogIntelligenceClient $client): JsonResponse
    {
        if (! config('services.catalog_intelligence.enabled')) {
            return $this->notConfigured($request);
        }

        try {
            return response()->json($client->discover(
                $currentStore->get(),
                $request->file('images'),
                $request->validated('market'),
                $this->requestId($request),
            ));
        } catch (Throwable $exception) {
            return $this->failure($request, $exception);
        }
    }

    private function notConfigured(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'code' => 'SCANNER_NOT_CONNECTED',
            'message' => 'Layanan scanner belum terhubung. Hubungi administrator.',
            'request_id' => $this->requestId($request),
        ], 503);
    }

    private function failure(Request $request, Throwable $exception): JsonResponse
    {
        $upstreamStatus = $exception instanceof RequestException ? $exception->response->status() : null;
        if ($upstreamStatus === 429) {
            [$status, $code, $message] = [429, 'SCANNER_BUSY', 'Scanner sedang sibuk. Coba lagi sebentar.'];
        } elseif (in_array($upstreamStatus, [401, 403], true)) {
            [$status, $code, $message] = [503, 'SCANNER_NOT_CONNECTED', 'Layanan scanner belum terhubung. Hubungi administrator.'];
        } else {
            [$status, $code, $message] = [503, 'SCANNER_UNAVAILABLE', 'Pengenalan sedang terganggu. Coba lagi atau cari manual.'];
        }

        return response()->json([
            'status' => 'error',
            'code' => $code,
            'message' => $message,
            'request_id' => $this->requestId($request),
        ], $status);
    }

    private function requestId(Request $request): string
    {
        return (string) $request->attributes->get('request_id', str()->uuid());
    }
}
