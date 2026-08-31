<?php

namespace App\Actions\Intelligence;

use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Services\Intelligence\CatalogIntelligenceClient;
use Illuminate\Support\Collection;
use SplFileInfo;

class RecognizeCatalogItems
{
    public function __construct(private CatalogIntelligenceClient $client) {}

    /** @param list<SplFileInfo> $images
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

        $catalogItemKeys = [];
        foreach ($upstreamImages as $image) {
            if (! is_array($image) || ! is_array($image['items'] ?? null)) {
                continue;
            }
            foreach ($image['items'] as $item) {
                if (! is_array($item) || ! is_array($item['candidates'] ?? null)) {
                    continue;
                }
                foreach ($item['candidates'] as $candidate) {
                    if (is_array($candidate) && is_string($candidate['catalog_item_key'] ?? null)) {
                        $catalogItemKeys[] = $candidate['catalog_item_key'];
                    }
                }
            }
        }
        $keys = collect(array_values(array_unique($catalogItemKeys)));
        $productPublicIds = $keys->filter(fn (string $key) => str_starts_with($key, 'product:'))
            ->map(fn (string $key) => substr($key, 8))->unique()->values();
        $variantPublicIds = $keys->filter(fn (string $key) => str_starts_with($key, 'variant:'))
            ->map(fn (string $key) => substr($key, 8))->unique()->values();
        $candidateVariants = ProductVariant::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->whereIn('public_id', $variantPublicIds)
            ->whereHas('product', fn ($query) => $query->where('is_active', true))
            ->get(['id', 'product_id', 'public_id']);
        $products = Product::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->where(fn ($query) => $query
                ->whereIn('public_id', $productPublicIds)
                ->orWhereIn('id', $candidateVariants->pluck('product_id')))
            ->with([
                'productUnits' => fn ($query) => $query->where('is_active', true)->with('unit'),
                'variants' => fn ($query) => $query->where('is_active', true)->with([
                    'productUnits' => fn ($units) => $units->where('is_active', true)->with('unit'),
                ]),
            ])
            ->get();
        $productsByPublicId = $products->keyBy('public_id');
        $productsById = $products->keyBy('id');
        $resolved = collect();

        foreach ($productPublicIds as $publicId) {
            if ($productsByPublicId->has($publicId)) {
                $resolved->put("product:{$publicId}", [$productsByPublicId->get($publicId), null]);
            }
        }
        foreach ($candidateVariants as $candidateVariant) {
            $product = $productsById->get($candidateVariant->product_id);
            $variant = $product?->variants->firstWhere('public_id', $candidateVariant->public_id);
            if ($product !== null && $variant !== null) {
                $resolved->put("variant:{$variant->public_id}", [$product, $variant]);
            }
        }

        $balances = InventoryBalance::query()
            ->where('store_id', $store->id)
            ->whereIn('product_id', $products->pluck('id'))
            ->get()
            ->keyBy(fn (InventoryBalance $balance) => $this->balanceKey($balance->product_id, $balance->product_variant_id));
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
                $grouped = collect();

                foreach (($item['candidates'] ?? []) as $candidate) {
                    if (! is_array($candidate) || ! is_string($candidate['catalog_item_key'] ?? null) || ! $resolved->has($candidate['catalog_item_key'])) {
                        continue;
                    }
                    [$product, $matchedVariant] = $resolved->get($candidate['catalog_item_key']);
                    $confidence = is_numeric($candidate['confidence'] ?? null) ? (float) $candidate['confidence'] : null;
                    $methods = $this->methods($candidate['methods'] ?? []);
                    $existing = $grouped->get($product->public_id);

                    if ($existing === null) {
                        $grouped->put($product->public_id, [
                            'product' => $product,
                            'matchedVariantPublicId' => $matchedVariant?->public_id,
                            'confidence' => $confidence,
                            'methods' => $methods,
                        ]);

                        continue;
                    }

                    $confidences = array_filter([
                        $existing['confidence'],
                        $confidence,
                    ], fn ($value) => $value !== null);
                    $existing['confidence'] = $confidences === [] ? null : max($confidences);
                    $existing['methods'] = array_values(array_unique([...$existing['methods'], ...$methods]));
                    $grouped->put($product->public_id, $existing);
                }

                $ranked = $grouped->map(function (array $evidence) use ($balances): array {
                    return [
                        'candidate' => $this->serializeProductCandidate(
                            $evidence['product'],
                            $balances,
                            $evidence['confidence'],
                            $evidence['methods'],
                        ),
                        'matchedVariantPublicId' => $evidence['matchedVariantPublicId'],
                    ];
                })->filter(fn (array $entry) => $entry['candidate']['options'] !== [])->take(3)->values();
                $upstreamStatus = $item['recognition_status'] ?? 'unknown';
                $status = $ranked->isEmpty() ? 'unknown' : ($upstreamStatus === 'found' ? 'found' : 'uncertain');
                $first = $ranked->first();
                $match = $status === 'found' ? $first['candidate'] : null;
                $selectedOption = null;

                if ($match !== null && is_array($first)) {
                    $options = is_array($match['options'] ?? null) ? array_values($match['options']) : [];
                    $matchedVariantPublicId = $first['matchedVariantPublicId'] ?? null;
                    $matchedVariantOptions = $matchedVariantPublicId === null
                        ? []
                        : array_values(array_filter(
                            $options,
                            fn ($option): bool => is_array($option)
                                && ($option['variantPublicId'] ?? null) === $matchedVariantPublicId,
                        ));
                    $selectedOption = count($matchedVariantOptions) === 1
                        ? $matchedVariantOptions[0]
                        : ($matchedVariantPublicId === null && count($options) === 1 ? $options[0] : null);
                }

                $results[] = [
                    'captureId' => $captureIds[$imageIndex] ?? (string) $imageIndex,
                    'imageIndex' => $imageIndex,
                    'itemIndex' => $itemIndex,
                    'status' => $status,
                    'match' => $match,
                    'selectedOption' => $selectedOption,
                    'candidates' => $ranked->pluck('candidate')->all(),
                ];
            }
        }

        return $results;
    }

    /** @return array<string, mixed> */
    public function serializeProductUnit(ProductUnit $unit, string $identifierType, string $captureId = 'identifier'): array
    {
        $unit->loadMissing(['product', 'productVariant', 'unit']);
        $unit->product->loadMissing([
            'productUnits.unit',
            'variants.productUnits.unit',
        ]);
        $balances = InventoryBalance::query()
            ->where('store_id', $unit->store_id)
            ->where('product_id', $unit->product_id)
            ->get()
            ->keyBy(fn (InventoryBalance $balance) => $this->balanceKey($balance->product_id, $balance->product_variant_id));
        $match = $this->serializeProductCandidate($unit->product, $balances, 1.0, [$identifierType]);

        return [
            'captureId' => $captureId,
            'imageIndex' => 0,
            'itemIndex' => 0,
            'status' => 'found',
            'match' => $match,
            'selectedOption' => $this->serializeSaleOption($unit->product, $unit->productVariant, $unit, $balances),
            'candidates' => [$match],
        ];
    }

    /** @param Collection<string, InventoryBalance> $balances
     * @param  list<string>  $methods
     * @return array<string, mixed>
     */
    private function serializeProductCandidate(Product $product, Collection $balances, ?float $confidence, array $methods): array
    {
        $options = $product->variant_mode === 'none'
            ? $product->productUnits
                ->whereNull('product_variant_id')
                ->filter(fn (ProductUnit $unit) => $unit->is_active && $unit->unit?->is_active)
                ->map(fn (ProductUnit $unit) => $this->serializeSaleOption($product, null, $unit, $balances))
            : $product->variants
                ->filter(fn (ProductVariant $variant) => $variant->is_active)
                ->flatMap(fn (ProductVariant $variant) => $variant->productUnits
                    ->filter(fn (ProductUnit $unit) => $unit->is_active && $unit->unit?->is_active)
                    ->map(fn (ProductUnit $unit) => $this->serializeSaleOption($product, $variant, $unit, $balances)));

        return [
            'productPublicId' => $product->public_id,
            'name' => $product->name,
            'photoUrl' => $product->photo_path ? route('master-data.products.photo', $product->public_id) : null,
            'confidence' => $confidence,
            'methods' => $methods,
            'options' => $options->values()->all(),
        ];
    }

    /** @param Collection<string, InventoryBalance> $balances
     * @return array<string, mixed>
     */
    private function serializeSaleOption(Product $product, ?ProductVariant $variant, ProductUnit $unit, Collection $balances): array
    {
        $balanceVariantId = $product->variant_mode === 'separate' ? $variant?->id : null;
        $balance = $balances->get($this->balanceKey($product->id, $balanceVariantId));
        $productId = $variant === null ? $product->public_id : $variant->public_id;

        return [
            'id' => $productId.':'.$unit->unit->public_id,
            'productId' => $productId,
            'productPublicId' => $product->public_id,
            'variantPublicId' => $variant?->public_id,
            'variantName' => $variant?->name,
            'unitId' => $unit->unit->public_id,
            'unitName' => $unit->unit->name,
            'unitSymbol' => $unit->unit->symbol,
            'purchasePrice' => (string) $unit->purchase_price,
            'sellingPrice' => (string) $unit->selling_price,
            'stockQuantity' => (string) ($balance === null ? '0.000000' : $balance->quantity),
        ];
    }

    /** @return list<string> */
    private function methods(mixed $methods): array
    {
        $validMethods = [];
        foreach (is_array($methods) ? $methods : [] as $method) {
            if (is_string($method) && in_array($method, ['barcode', 'sku', 'visual', 'ocr'], true)) {
                $validMethods[] = $method;
            }
        }

        return $validMethods;
    }

    private function balanceKey(int $productId, ?int $variantId): string
    {
        return $productId.':'.($variantId ?? 'none');
    }
}
