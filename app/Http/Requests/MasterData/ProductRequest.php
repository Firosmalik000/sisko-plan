<?php

namespace App\Http\Requests\MasterData;

use App\Models\Product;
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
        $product = $productId === null
            ? null
            : Product::query()->where('store_id', $storeId)->with('productUnits:id,product_id,unit_id,is_active')->find($productId);
        $currentCategoryId = $product?->category_id;
        $currentUnitIds = $product?->productUnits->where('is_active', true)->pluck('unit_id')->all() ?? [];
        $categoryInStore = fn ($query) => $query
            ->where('store_id', $storeId)
            ->where(fn ($status) => $status
                ->where('is_active', true)
                ->when($currentCategoryId !== null, fn ($current) => $current->orWhere('id', $currentCategoryId)));
        $unitInStore = fn ($query) => $query
            ->where('store_id', $storeId)
            ->where(fn ($status) => $status
                ->where('is_active', true)
                ->when($currentUnitIds !== [], fn ($current) => $current->orWhereIn('id', $currentUnitIds)));

        return [
            'idempotency_key' => [Rule::requiredIf($this->isMethod('post')), 'nullable', 'uuid'],
            'name' => ['required', 'string', 'max:160'],
            'sku' => ['nullable', 'string', 'max:80', Rule::unique('products')->where('store_id', $storeId)->ignore($productId)],
            'barcode' => ['nullable', 'string', 'max:120', Rule::unique('products')->where('store_id', $storeId)->ignore($productId)],
            'description' => ['nullable', 'string', 'max:500'],
            'category_public_id' => ['nullable', Rule::exists('categories', 'public_id')->where($categoryInStore)],
            'base_unit_public_id' => ['required', Rule::exists('units', 'public_id')->where($unitInStore)],
            'is_active' => ['sometimes', 'boolean'],
            'units' => ['required', 'array', 'min:1'],
            'units.*.unit_public_id' => ['required', 'distinct', Rule::exists('units', 'public_id')->where($unitInStore)],
            'units.*.conversion_factor' => ['required', 'decimal:0,6', 'gt:0', 'max:999999999999.999999'],
            'units.*.purchase_price' => ['required', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'units.*.selling_price' => ['required', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $units = $this->input('units');
            $baseUnitPublicId = $this->input('base_unit_public_id');
            $hasBaseUnit = false;

            if (is_array($units)) {
                foreach ($units as $unit) {
                    if (is_array($unit) && ($unit['unit_public_id'] ?? null) === $baseUnitPublicId) {
                        $hasBaseUnit = true;
                        break;
                    }
                }
            }

            if (! $hasBaseUnit) {
                $validator->errors()->add('base_unit_public_id', 'Satuan dasar harus ada dalam daftar satuan produk.');
            }
        }];
    }

    /**
     * @return array{
     *     idempotency_key: string|null,
     *     name: string,
     *     sku: string|null,
     *     barcode: string|null,
     *     description: string|null,
     *     category_public_id: string|null,
     *     base_unit_public_id: string,
     *     is_active: bool,
     *     units: array<int, array{unit_public_id: string, conversion_factor: numeric-string, purchase_price: numeric-string, selling_price: numeric-string}>
     * }
     */
    public function productData(): array
    {
        $name = $this->validated('name');
        $baseUnitPublicId = $this->validated('base_unit_public_id');
        $validatedUnits = $this->validated('units');

        if (! is_string($name) || ! is_string($baseUnitPublicId) || ! is_array($validatedUnits)) {
            throw new LogicException('Validated product payload has an unexpected shape.');
        }

        $units = [];
        foreach ($validatedUnits as $unit) {
            if (! is_array($unit) || ! is_string($unit['unit_public_id'] ?? null)) {
                throw new LogicException('Validated product unit has an unexpected shape.');
            }

            $units[] = [
                'unit_public_id' => $unit['unit_public_id'],
                'conversion_factor' => $this->numericString($unit['conversion_factor'] ?? null),
                'purchase_price' => $this->numericString($unit['purchase_price'] ?? null),
                'selling_price' => $this->numericString($unit['selling_price'] ?? null),
            ];
        }

        return [
            'idempotency_key' => $this->nullableString('idempotency_key'),
            'name' => $name,
            'sku' => $this->nullableString('sku'),
            'barcode' => $this->nullableString('barcode'),
            'description' => $this->nullableString('description'),
            'category_public_id' => $this->nullableString('category_public_id'),
            'base_unit_public_id' => $baseUnitPublicId,
            'is_active' => $this->has('is_active') ? $this->boolean('is_active') : true,
            'units' => $units,
        ];
    }

    private function nullableString(string $key): ?string
    {
        $value = $this->validated($key);

        return is_string($value) && $value !== '' ? $value : null;
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
