<?php

namespace App\Services\Intelligence;

use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use SplFileInfo;
use Throwable;
use UnexpectedValueException;

class CatalogIntelligenceClient
{
    public function provisionNamespace(Store $store, string $requestId): array
    {
        return $this->send(
            $store,
            $requestId,
            'provision_namespace',
            'PUT',
            '/api/v1/namespaces/'.$store->catalogNamespaceKey(),
            [],
            [],
            false,
            false,
            false,
        );
    }

    /** @param list<UploadedFile|SplFileInfo> $images */
    public function recognize(Store $store, array $images, string $requestId): array
    {
        return $this->send($store, $requestId, 'recognize', 'POST', '/api/v1/catalog-item-recognitions', [], $images);
    }

    /** @param list<UploadedFile|SplFileInfo> $images */
    public function discover(Store $store, array $images, string $market, string $requestId): array
    {
        return $this->send(
            $store,
            $requestId,
            'discover',
            'POST',
            '/api/v1/catalog-item-discoveries',
            ['market' => $market],
            $images,
            timeout: (int) config('services.catalog_intelligence.discovery_timeout'),
        );
    }

    /** @param array<string, mixed> $searchMetadata
     * @param  list<UploadedFile|SplFileInfo>  $images
     */
    public function syncCatalogItem(Store $store, string $catalogItemKey, bool $active, array $searchMetadata, array $images, string $requestId): array
    {
        $data = json_encode([
            'active' => $active,
            'search_metadata' => $searchMetadata,
        ], JSON_THROW_ON_ERROR);

        return $this->send(
            $store,
            $requestId,
            'sync',
            'PUT',
            '/api/v1/catalog-items/'.$catalogItemKey,
            ['data' => $data],
            $images,
        );
    }

    public function syncProduct(Product $product, string $requestId): void
    {
        $product->loadMissing([
            'store',
            'baseUnit',
            'productUnits.unit',
            'variants.productUnits.unit',
        ]);
        $baseUnit = $product->productUnits->first(
            fn (ProductUnit $unit) => $unit->product_variant_id === null && $unit->unit_id === $product->base_unit_id,
        );
        $usesVariants = $product->variant_mode !== 'none';
        $activeVariants = $product->variants->filter(
            fn (ProductVariant $variant) => $variant->is_active && $variant->productUnits->contains('is_active', true),
        );
        $productActive = $product->is_active && ($usesVariants
            ? $activeVariants->isNotEmpty()
            : $baseUnit?->is_active === true);

        $this->syncCatalogItem(
            $product->store,
            "product:{$product->public_id}",
            $productActive,
            $this->metadata($product, null, $baseUnit),
            $productActive ? $this->images($product->photo_path) : [],
            $requestId,
        );

        $product->variants->each(function (ProductVariant $variant) use ($product, $requestId, $usesVariants): void {
            $unit = $variant->productUnits->first();
            $variantActive = $usesVariants && $product->is_active && $variant->is_active && $unit?->is_active === true;
            $this->syncCatalogItem(
                $product->store,
                "variant:{$variant->public_id}",
                $variantActive,
                $this->metadata($product, $variant, $unit),
                $variantActive ? $this->images($variant->photo_path) : [],
                $requestId,
            );
        });
    }

    /** @param array<string, string> $fields
     * @param  list<UploadedFile|SplFileInfo>  $images
     */
    private function send(
        Store $store,
        string $requestId,
        string $operation,
        string $method,
        string $path,
        array $fields,
        array $images,
        bool $includeNamespace = true,
        bool $multipart = true,
        bool $provisionMissingNamespace = true,
        ?int $timeout = null,
    ): array {
        $handles = [];
        $startedAt = hrtime(true);

        try {
            $request = $this->request($includeNamespace ? $store : null, $requestId, $timeout);
            if ($multipart) {
                $request = $request->asMultipart();
            }
            foreach ($images as $image) {
                $pathName = $image->getRealPath();
                if ($pathName === false || ($handle = fopen($pathName, 'rb')) === false) {
                    throw new UnexpectedValueException('Image file is unavailable.');
                }
                $handles[] = $handle;
                $fileName = $image instanceof UploadedFile ? $image->getClientOriginalName() : $image->getFilename();
                $request = $request->attach('images', $handle, $fileName);
            }

            $response = $method === 'PUT' ? $request->put($path, $fields) : $request->post($path, $fields);
            if ($includeNamespace && $provisionMissingNamespace && $this->namespaceMissing($response)) {
                $this->provisionNamespace($store, $requestId);

                return $this->send($store, $requestId, $operation, $method, $path, $fields, $images, true, $multipart, false, $timeout);
            }

            return $this->validatedEnvelope($response);
        } catch (Throwable $exception) {
            $this->logFailure($store, $requestId, $operation, $path, $startedAt, $exception);

            throw $exception;
        } finally {
            foreach ($handles as $handle) {
                fclose($handle);
            }
        }
    }

    private function request(?Store $store, string $requestId, ?int $timeout = null): PendingRequest
    {
        $request = Http::baseUrl(rtrim((string) config('services.catalog_intelligence.url'), '/'))
            ->withToken((string) config('services.catalog_intelligence.token'))
            ->withHeaders([
                'X-Application-Key' => (string) config('services.catalog_intelligence.application_key'),
                'X-Request-Id' => $requestId,
            ])
            ->connectTimeout((int) config('services.catalog_intelligence.connect_timeout'))
            ->timeout($timeout ?? (int) config('services.catalog_intelligence.timeout'));

        return $store === null
            ? $request
            : $request->withHeader('X-Namespace-Key', $store->catalogNamespaceKey());
    }

    /** @return array<string, mixed> */
    private function validatedEnvelope(Response $response): array
    {
        $response->throw();
        $payload = $response->json();
        if (! is_array($payload) || ($payload['status'] ?? null) !== 'success' || ! array_key_exists('data', $payload)) {
            throw new UnexpectedValueException('Catalog intelligence returned an invalid response.');
        }

        return $payload;
    }

    private function namespaceMissing(Response $response): bool
    {
        return $response->status() === 404 && data_get($response->json(), 'data.code') === 'NAMESPACE_NOT_FOUND';
    }

    /** @return array<string, string|null> */
    private function metadata(Product $product, ?ProductVariant $variant, ?ProductUnit $unit): array
    {
        return [
            'name' => $product->name,
            'variant_name' => $variant?->name,
            'sku' => $unit?->sku,
            'barcode' => $unit?->barcode,
            'unit' => $unit?->unit?->symbol,
        ];
    }

    /** @return list<SplFileInfo> */
    private function images(?string $path): array
    {
        if ($path === null || ! Storage::disk('local')->exists($path)) {
            return [];
        }

        return [new SplFileInfo(Storage::disk('local')->path($path))];
    }

    private function logFailure(Store $store, string $requestId, string $operation, string $path, int $startedAt, Throwable $exception): void
    {
        $response = $exception instanceof RequestException ? $exception->response : null;
        Log::warning('Catalog intelligence request failed.', [
            'request_id' => $requestId,
            'store_public_id' => $store->public_id,
            'namespace_key' => $store->catalogNamespaceKey(),
            'operation' => $operation,
            'endpoint' => $path,
            'upstream_status' => $response?->status(),
            'upstream_code' => data_get($response?->json(), 'data.code'),
            'duration_ms' => intdiv(hrtime(true) - $startedAt, 1_000_000),
            'exception' => $exception::class,
        ]);
    }
}
