<?php

namespace App\Http\Requests\MasterData;

use App\Enums\ProductVariantMode;
use App\Enums\UnitType;
use App\Models\Product;
use App\Models\Unit;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use LogicException;

class ProductRequest extends MasterDataRequest
{
    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $productId = $this->routeModelId('products', 'product');
        $product = $productId === null ? null : Product::query()->where('store_id', $storeId)->find($productId);
        $categoryReference = fn ($query) => $query->where('store_id', $storeId)->where(fn ($status) => $status
            ->where('is_active', true)->when($product?->category_id, fn ($current) => $current->orWhere('id', $product->category_id)));
        $unitReference = fn ($query) => $query->where('store_id', $storeId)->where(fn ($status) => $status
            ->where('is_active', true)->when($product?->base_unit_id, fn ($current) => $current->orWhere('id', $product->base_unit_id))
            ->when($product?->large_unit_id, fn ($current) => $current->orWhere('id', $product->large_unit_id)));

        return [
            'idempotency_key' => [Rule::requiredIf($this->isMethod('post') && $productId === null), 'nullable', 'uuid'],
            'name' => ['required', 'string', 'max:160'],
            'category_public_id' => [Rule::requiredIf(! is_array($this->input('units'))), 'nullable', Rule::exists('categories', 'public_id')->where($categoryReference)],
            'retail_unit_public_id' => ['required_without:base_unit_public_id', Rule::exists('units', 'public_id')->where($unitReference)],
            'large_unit_public_id' => ['required', Rule::exists('units', 'public_id')->where($unitReference)],
            'variant_mode' => ['required', Rule::enum(ProductVariantMode::class)],
            'purchase_price' => ['required_if:variant_mode,none', 'nullable', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'selling_price' => ['required_if:variant_mode,none', 'nullable', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'current_stock' => ['required_unless:variant_mode,separate', 'nullable', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'minimum_stock' => ['required_unless:variant_mode,separate', 'nullable', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'variants' => ['exclude_if:variant_mode,none', 'required', 'array', 'min:1', 'max:50'],
            'variants.*.public_id' => ['nullable', 'string', 'size:26'],
            'variants.*.name' => ['required', 'string', 'max:120', 'distinct:ignore_case'],
            'variants.*.purchase_price' => ['required', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'variants.*.selling_price' => ['required', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'variants.*.current_stock' => ['required_if:variant_mode,separate', 'nullable', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'variants.*.minimum_stock' => ['required_if:variant_mode,separate', 'nullable', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'variants.*.conversion_factor' => ['required_if:variant_mode,shared', 'nullable', 'decimal:0,6', 'gt:0', 'max:999999999999.999999'],
            'photo' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
            'remove_photo' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],

            // Kept for backwards compatibility with existing clients.
            'base_unit_public_id' => ['nullable', Rule::exists('units', 'public_id')->where($unitReference)],
            'sku' => ['nullable', 'string', 'max:80', Rule::unique('products')->where('store_id', $storeId)->ignore($productId)],
            'barcode' => ['nullable', 'string', 'max:120', Rule::unique('products')->where('store_id', $storeId)->ignore($productId)],
            'description' => ['nullable', 'string', 'max:500'],
            'units' => ['nullable', 'array', 'min:1'],
            'units.*.unit_public_id' => ['required_with:units', Rule::exists('units', 'public_id')->where($unitReference)],
            'units.*.conversion_factor' => ['required_with:units', 'decimal:0,6', 'gt:0', 'max:999999999999.999999'],
            'units.*.purchase_price' => ['required_with:units', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'units.*.selling_price' => ['required_with:units', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('variant_mode') && is_array($this->input('units'))) {
            $units = $this->input('units');
            $base = collect($units)->firstWhere('unit_public_id', $this->input('base_unit_public_id')) ?? $units[0] ?? [];
            $large = collect($units)->first(fn ($unit) => ($unit['unit_public_id'] ?? null) !== ($base['unit_public_id'] ?? null));
            $this->merge([
                'variant_mode' => ProductVariantMode::None->value,
                'retail_unit_public_id' => $base['unit_public_id'] ?? null,
                'large_unit_public_id' => $large['unit_public_id'] ?? ($base['unit_public_id'] ?? null),
                'purchase_price' => $base['purchase_price'] ?? '0',
                'selling_price' => $base['selling_price'] ?? '0',
                'current_stock' => '0',
                'minimum_stock' => '0',
            ]);
        }
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if (is_array($this->input('units'))) {
                return;
            }
            $types = Unit::query()->where('store_id', app(CurrentStore::class)->id())
                ->whereIn('public_id', array_filter([$this->input('retail_unit_public_id'), $this->input('large_unit_public_id')]))
                ->pluck('unit_type', 'public_id');
            $retail = $this->input('retail_unit_public_id');
            $large = $this->input('large_unit_public_id');
            if (is_string($retail) && ($types[$retail] ?? null)?->value !== UnitType::Retail->value) {
                $validator->errors()->add('retail_unit_public_id', 'Pilih satuan dari kelompok ecer.');
            }
            if (is_string($large) && $large !== $retail && ($types[$large] ?? null)?->value !== UnitType::Large->value) {
                $validator->errors()->add('large_unit_public_id', 'Pilih satuan dari kelompok besar.');
            }
        }];
    }

    /** @return array<string, mixed> */
    public function productData(): array
    {
        $data = $this->validated();
        foreach (['current_stock', 'minimum_stock', 'purchase_price', 'selling_price'] as $key) {
            if (isset($data[$key])) {
                $data[$key] = $this->numericString($data[$key]);
            }
        }
        foreach ($data['variants'] ?? [] as $index => $variant) {
            foreach (['purchase_price', 'selling_price', 'current_stock', 'minimum_stock', 'conversion_factor'] as $key) {
                if (isset($variant[$key])) {
                    $data['variants'][$index][$key] = $this->numericString($variant[$key]);
                }
            }
        }

        return $data;
    }

    /** @return numeric-string */
    private function numericString(mixed $value): string
    {
        if (! is_numeric($value)) {
            throw new LogicException('Validated numeric value has an unexpected type.');
        }

        return (string) $value;
    }
}
