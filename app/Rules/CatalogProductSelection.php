<?php

namespace App\Rules;

use App\Models\Product;
use App\Models\ProductVariant;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class CatalogProductSelection implements ValidationRule
{
    public function __construct(private int $storeId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Produk tidak valid.');

            return;
        }

        $productExists = Product::query()->where(['store_id' => $this->storeId, 'public_id' => $value, 'is_active' => true])
            ->whereHas('productUnits', fn ($query) => $query->whereNull('product_variant_id')->where('is_active', true))->exists();
        $variantExists = ProductVariant::query()->where(['product_variants.store_id' => $this->storeId, 'product_variants.public_id' => $value, 'product_variants.is_active' => true])
            ->whereHas('product', fn ($query) => $query->where('is_active', true))
            ->whereHas('productUnits', fn ($query) => $query->where('is_active', true))->exists();

        if (! $productExists && ! $variantExists) {
            $fail('Produk tidak ditemukan pada toko aktif.');
        }
    }
}
