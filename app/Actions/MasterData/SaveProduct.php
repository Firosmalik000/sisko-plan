<?php

namespace App\Actions\MasterData;

use App\Actions\Audit\RecordAudit;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionAccess;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveProduct
{
    public function __construct(private RecordAudit $recordAudit, private SubscriptionAccess $subscriptionAccess) {}

    /**
     * @param  array{
     *     idempotency_key?: string|null,
     *     name: string,
     *     sku?: string|null,
     *     barcode?: string|null,
     *     description?: string|null,
     *     category_public_id?: string|null,
     *     base_unit_public_id: string,
     *     is_active?: bool,
     *     units: array<int, array{unit_public_id: string, conversion_factor: numeric-string, purchase_price: numeric-string, selling_price: numeric-string}>
     * }  $data
     */
    public function handle(
        User $actor,
        Store $store,
        array $data,
        ?Product $product = null,
        ?string $ipAddress = null,
    ): Product {
        try {
            return DB::transaction(function () use ($actor, $store, $data, $product, $ipAddress): Product {
                $lockedProduct = $product === null
                    ? null
                    : Product::query()->where('store_id', $store->id)->lockForUpdate()->findOrFail($product->id);
                $creationToken = $data['idempotency_key'] ?? null;
                if ($lockedProduct === null && is_string($creationToken)) {
                    $existing = Product::query()->where(['store_id' => $store->id, 'creation_token' => $creationToken])->first();
                    if ($existing !== null) {
                        return $existing->load(['category', 'baseUnit', 'productUnits.unit']);
                    }
                }
                if ($lockedProduct === null || (! $lockedProduct->is_active && ($data['is_active'] ?? true))) {
                    $this->subscriptionAccess->assertProductCapacity($store);
                    if ($lockedProduct === null && is_string($creationToken)) {
                        $existing = Product::query()->where(['store_id' => $store->id, 'creation_token' => $creationToken])->first();
                        if ($existing !== null) {
                            return $existing->load(['category', 'baseUnit', 'productUnits.unit']);
                        }
                    }
                }
                $oldPrices = $lockedProduct?->productUnits()
                    ->where('is_active', true)
                    ->with('unit:id,public_id,symbol')
                    ->get()
                    ->mapWithKeys(fn ($item) => [$item->unit->public_id => [
                        'purchase_price' => $item->purchase_price,
                        'selling_price' => $item->selling_price,
                    ]])
                    ->sortKeys()
                    ->all() ?? [];

                $categoryId = filled($data['category_public_id'] ?? null)
                    ? Category::query()->where('store_id', $store->id)->where('public_id', $data['category_public_id'])->value('id')
                    : null;
                $units = Unit::query()
                    ->where('store_id', $store->id)
                    ->whereIn('public_id', collect($data['units'])->pluck('unit_public_id'))
                    ->get(['id', 'public_id']);
                $baseUnitId = $units->firstWhere('public_id', $data['base_unit_public_id'])?->id;
                abort_unless($baseUnitId !== null, 422);

                $productData = [
                    'store_id' => $store->id,
                    'category_id' => $categoryId,
                    'base_unit_id' => $baseUnitId,
                    'name' => $data['name'],
                    'sku' => filled($data['sku'] ?? null) ? $data['sku'] : null,
                    'barcode' => filled($data['barcode'] ?? null) ? $data['barcode'] : null,
                    'description' => filled($data['description'] ?? null) ? $data['description'] : null,
                    'is_active' => $data['is_active'] ?? true,
                ];

                if ($lockedProduct === null) {
                    abort_unless(is_string($creationToken), 422);
                    $lockedProduct = Product::firstOrCreate(
                        ['store_id' => $store->id, 'creation_token' => $creationToken],
                        $productData,
                    );

                    if (! $lockedProduct->wasRecentlyCreated) {
                        return $lockedProduct->load(['category', 'baseUnit', 'productUnits.unit']);
                    }
                } else {
                    $lockedProduct->update($productData);
                }

                $activeUnitIds = [];
                foreach ($data['units'] as $unitData) {
                    $unit = $units->firstWhere('public_id', $unitData['unit_public_id']);
                    abort_unless($unit !== null, 422);
                    $activeUnitIds[] = $unit->id;

                    $lockedProduct->productUnits()->updateOrCreate(
                        ['unit_id' => $unit->id],
                        [
                            'store_id' => $store->id,
                            'conversion_factor' => $unit->id === $baseUnitId ? 1 : $unitData['conversion_factor'],
                            'purchase_price' => $unitData['purchase_price'],
                            'selling_price' => $unitData['selling_price'],
                            'is_active' => true,
                        ],
                    );
                }

                $lockedProduct->productUnits()->whereNotIn('unit_id', $activeUnitIds)->update(['is_active' => false]);
                $lockedProduct->load(['category', 'baseUnit', 'productUnits.unit']);

                $newPrices = $lockedProduct->productUnits
                    ->where('is_active', true)
                    ->mapWithKeys(fn ($item) => [$item->unit->public_id => [
                        'purchase_price' => $item->purchase_price,
                        'selling_price' => $item->selling_price,
                    ]])
                    ->sortKeys()
                    ->all();
                $action = $product === null ? 'product.created' : 'product.updated';
                $metadata = $oldPrices === $newPrices ? [] : ['prices_before' => $oldPrices, 'prices_after' => $newPrices];

                $this->recordAudit->handle($actor, $action, $lockedProduct, $store, $ipAddress, $metadata);

                return $lockedProduct;
            });
        } catch (UniqueConstraintViolationException) {
            $creationToken = $data['idempotency_key'] ?? null;
            $existing = is_string($creationToken)
                ? Product::query()->where('store_id', $store->id)->where('creation_token', $creationToken)->first()
                : null;

            if ($existing !== null) {
                return $existing->load(['category', 'baseUnit', 'productUnits.unit']);
            }

            throw ValidationException::withMessages([
                'sku' => 'SKU atau barcode sudah digunakan oleh produk lain.',
                'barcode' => 'SKU atau barcode sudah digunakan oleh produk lain.',
            ]);
        }
    }
}
