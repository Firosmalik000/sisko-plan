<?php

namespace App\Http\Requests\MasterData;

use App\Enums\ProductVariantMode;
use App\Enums\UnitType;
use App\Models\Product;
use App\Models\ProductUnit;
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
            'description' => ['nullable', 'string', 'max:500'],
            'category_public_id' => ['required', Rule::exists('categories', 'public_id')->where($categoryReference)],
            'retail_unit_public_id' => ['required', Rule::exists('units', 'public_id')->where($unitReference)],
            'large_unit_public_id' => ['required', Rule::exists('units', 'public_id')->where($unitReference)],
            'variant_mode' => ['required', Rule::enum(ProductVariantMode::class)],
            'sku' => ['nullable', 'string', 'max:80'],
            'barcode' => ['nullable', 'string', 'max:120'],
            'purchase_price' => ['required_if:variant_mode,none', 'nullable', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'selling_price' => ['required_if:variant_mode,none', 'nullable', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'current_stock' => ['required_unless:variant_mode,separate', 'nullable', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'minimum_stock' => ['required_unless:variant_mode,separate', 'nullable', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'variants' => ['exclude_if:variant_mode,none', 'required', 'array', 'min:1', 'max:50'],
            'variants.*.public_id' => ['nullable', 'string', 'size:26'],
            'variants.*.name' => ['required', 'string', 'max:120', 'distinct:ignore_case'],
            'variants.*.sku' => ['nullable', 'string', 'max:80'],
            'variants.*.barcode' => ['nullable', 'string', 'max:120'],
            'variants.*.photo' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
            'variants.*.remove_photo' => ['sometimes', 'boolean'],
            'variants.*.purchase_price' => ['required', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'variants.*.selling_price' => ['required', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'variants.*.current_stock' => ['required_if:variant_mode,separate', 'nullable', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'variants.*.minimum_stock' => ['required_if:variant_mode,separate', 'nullable', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'variants.*.conversion_factor' => ['required_if:variant_mode,shared', 'nullable', 'decimal:0,6', 'gt:0', 'max:999999999999.999999'],
            'photo' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
            'remove_photo' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $this->validateCodes($validator);

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

    private function validateCodes(Validator $validator): void
    {
        $storeId = app(CurrentStore::class)->id();
        $productId = $this->routeModelId('products', 'product');
        $submitted = [
            ['key' => 'sku', 'column' => 'sku', 'value' => $this->input('sku')],
            ['key' => 'barcode', 'column' => 'barcode', 'value' => $this->input('barcode')],
        ];

        foreach ($this->input('variants', []) as $index => $variant) {
            foreach (['sku', 'barcode'] as $column) {
                $submitted[] = [
                    'key' => "variants.{$index}.{$column}",
                    'column' => $column,
                    'value' => is_array($variant) ? ($variant[$column] ?? null) : null,
                ];
            }
        }

        $seen = [];
        foreach ($submitted as $field) {
            $value = trim((string) $field['value']);
            if ($value === '') {
                continue;
            }

            $duplicateKey = $field['column'].'|'.mb_strtolower($value);
            if (isset($seen[$duplicateKey])) {
                $validator->errors()->add($field['key'], 'Kode ini digunakan lebih dari sekali pada produk yang sama.');

                continue;
            }
            $seen[$duplicateKey] = true;

            $conflict = ProductUnit::query()
                ->where('store_id', $storeId)
                ->where($field['column'], $value)
                ->when($productId !== null, fn ($query) => $query->where('product_id', '!=', $productId))
                ->exists();
            if ($conflict) {
                $validator->errors()->add($field['key'], 'Kode ini sudah digunakan produk lain di toko ini.');
            }
        }
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
