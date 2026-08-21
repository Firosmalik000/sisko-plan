<?php

namespace App\Rules;

use App\Models\Product;
use App\Models\ProductVariant;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StockIdentity implements ValidationRule
{
    public function __construct(private int $storeId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Produk persediaan tidak valid.');

            return;
        }

        $exists = Product::query()->where(['store_id' => $this->storeId, 'public_id' => $value])
            ->where('variant_mode', '!=', 'separate')->exists()
            || ProductVariant::query()->where(['store_id' => $this->storeId, 'public_id' => $value])
                ->whereHas('product', fn ($query) => $query->where('variant_mode', 'separate'))->exists();

        if (! $exists) {
            $fail('Produk persediaan tidak ditemukan pada toko aktif.');
        }
    }
}
