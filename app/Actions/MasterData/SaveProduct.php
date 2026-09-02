<?php

namespace App\Actions\MasterData;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\ApplyStockMovement;
use App\Enums\ProductVariantMode;
use App\Models\Category;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Services\Intelligence\CatalogIntelligenceClient;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Decimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;
use UnexpectedValueException;

use function Illuminate\Support\defer;

class SaveProduct
{
    public function __construct(
        private RecordAudit $recordAudit,
        private SubscriptionAccess $subscriptionAccess,
        private ApplyStockMovement $stock,
        private CatalogIntelligenceClient $catalogIntelligence,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, Store $store, array $data, ?Product $product = null, ?UploadedFile $photo = null, ?string $ipAddress = null): Product
    {
        $newPhotoPath = $photo?->storeAs(
            "product-photos/{$store->public_id}",
            Str::ulid().'.'.$photo->extension(),
            'local',
        );
        if ($newPhotoPath === false) {
            throw new UnexpectedValueException('The product photo could not be stored.');
        }
        $newVariantPhotoPaths = [];

        try {
            $saved = DB::transaction(function () use ($actor, $store, $data, $product, $newPhotoPath, &$newVariantPhotoPaths, $ipAddress): Product {
                $locked = $product === null ? null : Product::query()
                    ->where('store_id', $store->id)->lockForUpdate()->findOrFail($product->id);
                $creationToken = $data['idempotency_key'] ?? null;
                if ($locked === null && is_string($creationToken)) {
                    $existing = Product::query()->where(['store_id' => $store->id, 'creation_token' => $creationToken])->first();
                    if ($existing !== null) {
                        return $existing;
                    }
                }
                if ($locked === null || (! $locked->is_active && ($data['is_active'] ?? true))) {
                    $this->subscriptionAccess->assertProductCapacity($store);
                }
                $oldPrices = $locked?->productUnits()->where('is_active', true)->with('unit:id,public_id')->get()
                    ->mapWithKeys(fn ($item) => [($item->product_variant_id ?? 'product').':'.$item->unit->public_id => [
                        'purchase_price' => $item->purchase_price,
                        'selling_price' => $item->selling_price,
                    ]])->sortKeys()->all() ?? [];
                $oldMode = $locked === null ? null : ProductVariantMode::from($locked->variant_mode);

                $categoryId = filled($data['category_public_id'] ?? null)
                    ? Category::query()->where(['store_id' => $store->id, 'public_id' => $data['category_public_id']])->valueOrFail('id')
                    : null;
                $retailUnitId = Unit::query()->where(['store_id' => $store->id, 'public_id' => $data['retail_unit_public_id']])->valueOrFail('id');
                $largeUnitId = Unit::query()->where(['store_id' => $store->id, 'public_id' => $data['large_unit_public_id']])->valueOrFail('id');
                $mode = ProductVariantMode::from($data['variant_mode']);
                $oldPhotoPath = $locked?->photo_path;
                $photoPath = $newPhotoPath ?: (($data['remove_photo'] ?? false) ? null : $oldPhotoPath);
                $productData = [
                    'store_id' => $store->id,
                    'category_id' => $categoryId,
                    'base_unit_id' => $retailUnitId,
                    'large_unit_id' => $largeUnitId,
                    'variant_mode' => $mode->value,
                    'name' => $data['name'],
                    'description' => filled($data['description'] ?? null) ? $data['description'] : null,
                    'photo_path' => $photoPath,
                    'is_active' => $data['is_active'] ?? true,
                ];
                if ($locked === null) {
                    abort_unless(is_string($creationToken), 422);
                    $locked = Product::create(['creation_token' => $creationToken, ...$productData]);
                } else {
                    $locked->update($productData);
                }

                if ($oldMode !== null && $oldMode !== $mode) {
                    if ($oldMode === ProductVariantMode::Separate) {
                        $locked->variants()->where('is_active', true)->get()->each(
                            fn (ProductVariant $variant) => $this->setStock($store, $actor, $locked, $variant, '0', '0', '0'),
                        );
                    } else {
                        $this->setStock($store, $actor, $locked, null, '0', '0', '0');
                    }
                }

                $locked->productUnits()->update(['is_active' => false]);
                $activeVariantIds = [];
                if ($mode === ProductVariantMode::None) {
                    $defaultUnit = $locked->productUnits()->updateOrCreate(['unit_id' => $retailUnitId, 'product_variant_id' => null], [
                        'store_id' => $store->id,
                        'sku' => filled($data['sku'] ?? null) ? trim($data['sku']) : null,
                        'barcode' => filled($data['barcode'] ?? null) ? trim($data['barcode']) : null,
                        'conversion_factor' => 1,
                        'purchase_price' => $data['purchase_price'],
                        'selling_price' => $data['selling_price'],
                        'is_active' => true,
                    ]);
                    $this->setStock($store, $actor, $locked, null, $data['current_stock'], $data['minimum_stock'], $data['purchase_price']);
                } else {
                    foreach ($data['variants'] as $variant) {
                        $child = $this->saveVariant($store, $locked, $variant, $mode, $retailUnitId, $largeUnitId, $newVariantPhotoPaths);
                        $activeVariantIds[] = $child->id;
                        if ($mode === ProductVariantMode::Separate) {
                            $this->setStock($store, $actor, $locked, $child, $variant['current_stock'], $variant['minimum_stock'], $variant['purchase_price']);
                        }
                    }
                    if ($mode === ProductVariantMode::Shared) {
                        $first = $data['variants'][0];
                        $baseCost = Decimal::divide($first['purchase_price'], $first['conversion_factor'], Decimal::MONEY_SCALE);
                        $this->setStock($store, $actor, $locked, null, $data['current_stock'], $data['minimum_stock'], $baseCost);
                    }
                }
                $removedVariants = $locked->variants()->where('is_active', true)->whereNotIn('id', $activeVariantIds)->get();
                if ($oldMode === ProductVariantMode::Separate) {
                    $removedVariants->each(fn (ProductVariant $variant) => $this->setStock($store, $actor, $locked, $variant, '0', '0', '0'));
                }
                $removedVariants->each(function (ProductVariant $variant): void {
                    $variant->update(['is_active' => false]);
                    $variant->productUnits()->update(['is_active' => false]);
                });

                $newPrices = $locked->productUnits()->where('is_active', true)->with('unit:id,public_id')->get()
                    ->mapWithKeys(fn ($item) => [($item->product_variant_id ?? 'product').':'.$item->unit->public_id => [
                        'purchase_price' => $item->purchase_price,
                        'selling_price' => $item->selling_price,
                    ]])->sortKeys()->all();
                $metadata = [
                    'variant_mode' => $mode->value,
                    'variants' => count($activeVariantIds),
                ];
                if ($oldPrices !== $newPrices) {
                    $metadata['prices_before'] = $oldPrices;
                    $metadata['prices_after'] = $newPrices;
                }
                $this->recordAudit->handle($actor, $product === null ? 'product.created' : 'product.updated', $locked, $store, $ipAddress, $metadata);
                if ($oldPhotoPath && $oldPhotoPath !== $photoPath) {
                    DB::afterCommit(fn () => Storage::disk('local')->delete($oldPhotoPath));
                }

                return $locked->fresh();
            }, 3);

            if (config('services.catalog_intelligence.enabled')) {
                defer(fn () => rescue(
                    fn () => $this->catalogIntelligence->syncProduct($saved->fresh(), (string) Str::uuid()),
                    report: false,
                ));
            }

            return $saved;
        } catch (UniqueConstraintViolationException) {
            if ($newPhotoPath) {
                Storage::disk('local')->delete($newPhotoPath);
            }
            Storage::disk('local')->delete($newVariantPhotoPaths);
            throw ValidationException::withMessages(['name' => 'Produk atau varian dengan data yang sama sudah tersedia.']);
        } catch (Throwable $exception) {
            if ($newPhotoPath) {
                Storage::disk('local')->delete($newPhotoPath);
            }
            Storage::disk('local')->delete($newVariantPhotoPaths);
            throw $exception;
        }
    }

    /**
     * @param  array<string, mixed>  $variant
     * @param  list<string>  $newPhotoPaths
     */
    private function saveVariant(Store $store, Product $parent, array $variant, ProductVariantMode $mode, int $retailUnitId, int $largeUnitId, array &$newPhotoPaths): ProductVariant
    {
        $child = isset($variant['public_id'])
            ? ProductVariant::query()->where(['store_id' => $store->id, 'product_id' => $parent->id, 'public_id' => $variant['public_id']])->lockForUpdate()->first()
            : null;
        $child ??= ProductVariant::query()->where([
            'store_id' => $store->id,
            'product_id' => $parent->id,
            'name' => $variant['name'],
            'is_active' => false,
        ])->lockForUpdate()->first();
        $oldPhotoPath = $child?->photo_path;
        $uploadedPhoto = $variant['photo'] ?? null;
        $newPhotoPath = $uploadedPhoto instanceof UploadedFile
            ? $uploadedPhoto->storeAs("product-variant-photos/{$store->public_id}", Str::ulid().'.'.$uploadedPhoto->extension(), 'local')
            : null;
        if ($newPhotoPath === false) {
            throw new UnexpectedValueException('The product variant photo could not be stored.');
        }
        if ($newPhotoPath !== null) {
            $newPhotoPaths[] = $newPhotoPath;
        }
        $photoPath = $newPhotoPath ?: (($variant['remove_photo'] ?? false) ? null : $oldPhotoPath);
        $childData = [
            'store_id' => $store->id,
            'product_id' => $parent->id,
            'name' => $variant['name'],
            'photo_path' => $photoPath,
            'is_active' => $parent->is_active,
        ];
        if ($child === null) {
            $child = ProductVariant::create($childData);
        } else {
            $child->update($childData);
        }
        $child->productUnits()->update(['is_active' => false]);
        $productUnit = $child->productUnits()->updateOrCreate(['unit_id' => $mode === ProductVariantMode::Shared ? $largeUnitId : $retailUnitId], [
            'store_id' => $store->id,
            'product_id' => $parent->id,
            'sku' => filled($variant['sku'] ?? null) ? trim($variant['sku']) : null,
            'barcode' => filled($variant['barcode'] ?? null) ? trim($variant['barcode']) : null,
            'conversion_factor' => $mode === ProductVariantMode::Shared ? $variant['conversion_factor'] : 1,
            'purchase_price' => $variant['purchase_price'],
            'selling_price' => $variant['selling_price'],
            'is_active' => true,
        ]);
        if ($oldPhotoPath && $oldPhotoPath !== $photoPath) {
            DB::afterCommit(fn () => Storage::disk('local')->delete($oldPhotoPath));
        }

        return $child;
    }

    private function setStock(Store $store, User $actor, Product $product, ?ProductVariant $variant, string $target, string $minimum, string $incomingCost): void
    {
        $stockKey = $variant === null ? "product:{$product->id}" : "variant:{$variant->id}";
        DB::table('inventory_balances')->insertOrIgnore([
            'store_id' => $store->id, 'product_id' => $product->id, 'product_variant_id' => $variant?->id, 'stock_key' => $stockKey, 'quantity' => 0,
            'average_cost' => 0, 'inventory_value' => 0, 'minimum_quantity' => 0,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $balance = InventoryBalance::query()->where(['store_id' => $store->id, 'stock_key' => $stockKey])->lockForUpdate()->firstOrFail();
        $difference = Decimal::subtract($target, $balance->quantity, Decimal::QUANTITY_SCALE);
        if (Decimal::compare($difference, '0', Decimal::QUANTITY_SCALE) !== 0) {
            $this->stock->handle(
                $store->id,
                $product->id,
                $difference,
                Decimal::compare($difference, '0', Decimal::QUANTITY_SCALE) > 0 ? $incomingCost : null,
                'product_stock_update',
                $product,
                now(),
                $actor,
                null,
                false,
                null,
                $variant?->id,
            );
        }
        $balance->update(['minimum_quantity' => $minimum]);
    }
}
