<?php

namespace App\Actions\Intelligence;

use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Services\Intelligence\CatalogIntelligenceClient;
use Illuminate\Support\Collection;

class RecognizeCatalogItems
{
    public function __construct(private CatalogIntelligenceClient $client) {}

    /** @param array<int, mixed> $images
     * @param  list<string>  $captureIds
     * @return list<array<string, mixed>>
     */
    public function handle(Store $store, array $images, array $captureIds, string $requestId): array
    {
        $payload = $this->client->recognize($store, $images, $requestId);
        $upstreamImages = data_get($payload, 'data.images', []);
        if (! is_array($upstreamImages)) {
            return [];
        }

        $keys = collect($upstreamImages)
            ->flatMap(fn ($image) => collect(is_array($image) ? ($image['items'] ?? []) : [])
                ->flatMap(fn ($item) => collect(is_array($item) ? ($item['candidates'] ?? []) : [])->pluck('catalog_item_key')))
            ->filter(fn ($key) => is_string($key));
        $productPublicIds = $keys->filter(fn (string $key) => str_starts_with($key, 'product:'))->map(fn (string $key) => substr($key, 8))->unique()->values();
        $variantPublicIds = $keys->filter(fn (string $key) => str_starts_with($key, 'variant:'))->map(fn (string $key) => substr($key, 8))->unique()->values();

        $products = Product::query()->where('store_id', $store->id)->where('is_active', true)
            ->whereIn('public_id', $productPublicIds)
            ->with(['productUnits' => fn ($query) => $query->whereNull('product_variant_id')->where('is_active', true)->with('unit')])
            ->get()->keyBy(fn (Product $product) => "product:{$product->public_id}");
        $variants = ProductVariant::query()->where('store_id', $store->id)->where('is_active', true)
            ->whereIn('public_id', $variantPublicIds)->whereHas('product', fn ($query) => $query->where('is_active', true))
            ->with(['product', 'productUnits' => fn ($query) => $query->where('is_active', true)->with('unit')])
            ->get()->keyBy(fn (ProductVariant $variant) => "variant:{$variant->public_id}");

        $resolved = collect();
        foreach ($products as $key => $product) {
            $unit = $product->productUnits->firstWhere('unit_id', $product->base_unit_id) ?? $product->productUnits->first();
            if ($unit !== null) {
                $resolved->put($key, [$product, null, $unit]);
            }
        }
        foreach ($variants as $key => $variant) {
            $unit = $variant->productUnits->first();
            if ($unit !== null) {
                $resolved->put($key, [$variant->product, $variant, $unit]);
            }
        }

        $balances = InventoryBalance::query()->where('store_id', $store->id)
            ->whereIn('product_id', $resolved->map(fn (array $target) => $target[0]->id)->unique())
            ->get()->keyBy(fn (InventoryBalance $balance) => $this->balanceKey($balance->product_id, $balance->product_variant_id));
        $results = [];
        foreach ($upstreamImages as $fallbackImageIndex => $image) {
            if (! is_array($image)) {
                continue;
            }
            $imageIndex = is_int($image['image_index'] ?? null) ? $image['image_index'] : $fallbackImageIndex;
            foreach (($image['items'] ?? []) as $fallbackItemIndex => $item) {
                if (! is_array($item)) {
                    continue;
                }
                $itemIndex = is_int($item['item_index'] ?? null) ? $item['item_index'] : $fallbackItemIndex;
                $candidates = collect($item['candidates'] ?? [])->map(function ($candidate) use ($resolved, $balances): ?array {
                    if (! is_array($candidate) || ! is_string($candidate['catalog_item_key'] ?? null) || ! $resolved->has($candidate['catalog_item_key'])) {
                        return null;
                    }
                    [$product, $variant, $unit] = $resolved->get($candidate['catalog_item_key']);

                    return $this->serializeTarget($product, $variant, $unit, $balances, [
                        'confidence' => is_numeric($candidate['confidence'] ?? null) ? (float) $candidate['confidence'] : null,
                        'methods' => $this->methods($candidate['methods'] ?? []),
                    ]);
                })->filter()->take(3)->values();
                $upstreamStatus = $item['recognition_status'] ?? 'unknown';
                $status = $candidates->isEmpty() ? 'unknown' : ($upstreamStatus === 'found' ? 'found' : 'uncertain');
                $selected = $status === 'found' ? $candidates->first() : null;
                $results[] = [
                    'captureId' => $captureIds[$imageIndex] ?? (string) $imageIndex,
                    'imageIndex' => $imageIndex,
                    'itemIndex' => $itemIndex,
                    'status' => $status,
                    ...$this->emptySelection(),
                    ...($selected ?? []),
                    'confidence' => $selected['confidence'] ?? null,
                    'methods' => $selected['methods'] ?? [],
                    'candidates' => $candidates->all(),
                ];
            }
        }

        return $results;
    }

    /** @return array<string, mixed> */
    public function serializeProductUnit(ProductUnit $unit, string $identifierType, string $captureId = 'identifier'): array
    {
        $unit->loadMissing(['product', 'productVariant', 'unit']);
        $balances = InventoryBalance::query()->where('store_id', $unit->store_id)
            ->where('product_id', $unit->product_id)->get()
            ->keyBy(fn (InventoryBalance $balance) => $this->balanceKey($balance->product_id, $balance->product_variant_id));

        return [
            'captureId' => $captureId,
            'imageIndex' => 0,
            'itemIndex' => 0,
            'status' => 'found',
            ...$this->serializeTarget($unit->product, $unit->productVariant, $unit, $balances, [
                'confidence' => 1.0,
                'methods' => [$identifierType],
            ]),
            'candidates' => [],
        ];
    }

    /** @param Collection<string, InventoryBalance> $balances
     * @param  array{confidence: float|null, methods: list<string>}  $match
     * @return array<string, mixed>
     */
    private function serializeTarget(Product $product, ?ProductVariant $variant, ProductUnit $unit, Collection $balances, array $match): array
    {
        $balanceVariantId = $product->variant_mode === 'separate' ? $variant?->id : null;
        $balance = $balances->get($this->balanceKey($product->id, $balanceVariantId));
        $photoUrl = $variant?->photo_path
            ? route('master-data.products.variants.photo', [$product->public_id, $variant->public_id])
            : ($variant === null && $product->photo_path ? route('master-data.products.photo', $product->public_id) : null);

        return [
            'productId' => $variant?->public_id ?? $product->public_id,
            'productPublicId' => $product->public_id,
            'variantPublicId' => $variant?->public_id,
            'unitId' => $unit->unit->public_id,
            'name' => $product->name,
            'variantName' => $variant?->name,
            'unitName' => $unit->unit->name,
            'unitSymbol' => $unit->unit->symbol,
            'purchasePrice' => (string) $unit->purchase_price,
            'sellingPrice' => (string) $unit->selling_price,
            'stockQuantity' => (string) ($balance?->quantity ?? '0.000000'),
            'photoUrl' => $photoUrl,
            'confidence' => $match['confidence'],
            'methods' => $match['methods'],
        ];
    }

    /** @return array<string, null> */
    private function emptySelection(): array
    {
        return array_fill_keys([
            'productId', 'productPublicId', 'variantPublicId', 'unitId', 'name', 'variantName',
            'unitName', 'unitSymbol', 'purchasePrice', 'sellingPrice', 'stockQuantity', 'photoUrl',
        ], null);
    }

    /** @return list<string> */
    private function methods(mixed $methods): array
    {
        return collect(is_array($methods) ? $methods : [])->filter(
            fn ($method) => is_string($method) && in_array($method, ['barcode', 'sku', 'visual', 'ocr'], true),
        )->values()->all();
    }

    private function balanceKey(int $productId, ?int $variantId): string
    {
        return $productId.':'.($variantId ?? 'none');
    }
}
