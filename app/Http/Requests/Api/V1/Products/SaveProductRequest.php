<?php

namespace App\Http\Requests\Api\V1\Products;

use App\Enums\ProductVariantMode;
use App\Enums\UnitType;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Store;
use App\Models\Unit;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use LogicException;

/**
 * Validasi mutasi produk via API mobile `POST`/`PATCH /stores/{store}/products`
 * (design §3.2, Req 10.3).
 *
 * Rilis ini mendukung bentuk MINIMAL: produk single-unit tanpa varian
 * (`variant_mode = none`). Payload API dipetakan ke bentuk `$data` yang
 * dikonsumsi `App\Actions\MasterData\SaveProduct::handle` sehingga business
 * logic create/update tidak diduplikasi.
 *
 * Field yang didukung:
 * - `name` (required, string ≤160)
 * - `description` (nullable, string ≤500)
 * - `category_public_id` (nullable) — kategori aktif milik toko
 * - `unit` (object, required):
 *   - `unit_public_id` (required) — satuan ecer aktif milik toko
 *   - `sku` (nullable ≤80), `barcode` (nullable ≤120)
 *   - `selling_price`, `purchase_price` (decimal scale 4)
 *   - `current_stock`, `minimum_stock` (decimal scale 6)
 * - `is_active` (boolean)
 * - `idempotency_key` (uuid; wajib saat create untuk creation token idempotent)
 *
 * Membership + tenant sudah divalidasi middleware `store.membership`; ability
 * `product.write` dicek di controller (fast gate) sebelum FormRequest dipakai.
 */
class SaveProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        $store = $this->route('store');
        $storeId = $store instanceof Store ? $store->id : 0;
        $isCreate = $this->isMethod('post');

        $categoryReference = fn ($query) => $query->where('store_id', $storeId)->where('is_active', true);
        $unitReference = fn ($query) => $query->where('store_id', $storeId)->where('is_active', true);

        return [
            'idempotency_key' => [Rule::requiredIf($isCreate), 'nullable', 'uuid'],
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'category_public_id' => ['nullable', Rule::exists('categories', 'public_id')->where($categoryReference)],
            'is_active' => ['sometimes', 'boolean'],
            'unit' => ['required', 'array'],
            'unit.unit_public_id' => ['required', Rule::exists('units', 'public_id')->where($unitReference)],
            'unit.sku' => ['nullable', 'string', 'max:80'],
            'unit.barcode' => ['nullable', 'string', 'max:120'],
            'unit.selling_price' => ['required', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'unit.purchase_price' => ['required', 'decimal:0,4', 'min:0', 'max:999999999999999.9999'],
            'unit.current_stock' => ['required', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
            'unit.minimum_stock' => ['required', 'decimal:0,6', 'min:0', 'max:999999999999.999999'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $store = $this->route('store');
            $storeId = $store instanceof Store ? $store->id : 0;

            $unitPublicId = $this->input('unit.unit_public_id');
            if (is_string($unitPublicId)) {
                $type = Unit::query()->where('store_id', $storeId)->where('public_id', $unitPublicId)->value('unit_type');
                if ($type?->value !== UnitType::Retail->value) {
                    $validator->errors()->add('unit.unit_public_id', __('Pilih satuan dari kelompok ecer.'));
                }
            }

            $this->validateCodeConflicts($validator, $storeId);
        }];
    }

    private function validateCodeConflicts(Validator $validator, int $storeId): void
    {
        $product = $this->currentProduct($storeId);

        foreach (['sku', 'barcode'] as $column) {
            $value = trim((string) $this->input("unit.{$column}", ''));
            if ($value === '') {
                continue;
            }

            $conflict = ProductUnit::query()
                ->where('store_id', $storeId)
                ->where($column, $value)
                ->when($product !== null, fn ($query) => $query->where('product_id', '!=', $product->id))
                ->exists();
            if ($conflict) {
                $validator->errors()->add("unit.{$column}", __('Kode ini sudah digunakan produk lain di toko ini.'));
            }
        }
    }

    /**
     * Payload API dipetakan ke bentuk `$data` yang dikonsumsi SaveProduct.
     *
     * @return array<string, mixed>
     */
    public function productData(): array
    {
        $validated = $this->validated();
        $unit = $validated['unit'];

        return [
            'idempotency_key' => $validated['idempotency_key'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'category_public_id' => $validated['category_public_id'] ?? null,
            'retail_unit_public_id' => $unit['unit_public_id'],
            'large_unit_public_id' => null,
            'variant_mode' => ProductVariantMode::None->value,
            'quantity_mode' => 'variable',
            'sku' => $unit['sku'] ?? null,
            'barcode' => $unit['barcode'] ?? null,
            'purchase_price' => $this->numericString($unit['purchase_price']),
            'selling_price' => $this->numericString($unit['selling_price']),
            'current_stock' => $this->numericString($unit['current_stock']),
            'minimum_stock' => $this->numericString($unit['minimum_stock']),
            'is_active' => $validated['is_active'] ?? true,
        ];
    }

    public function currentProduct(int $storeId): ?Product
    {
        $product = $this->route('product');

        if ($product instanceof Product) {
            return $product;
        }

        if (is_string($product)) {
            return Product::query()->where('store_id', $storeId)->where('public_id', $product)->first();
        }

        return null;
    }

    /**
     * @return numeric-string
     */
    private function numericString(mixed $value): string
    {
        if (! is_numeric($value)) {
            throw new LogicException('Validated numeric value has an unexpected type.');
        }

        return (string) $value;
    }
}
