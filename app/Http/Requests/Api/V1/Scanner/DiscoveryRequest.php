<?php

namespace App\Http\Requests\Api\V1\Scanner;

use App\Models\Store;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi `POST /stores/{store}/scanner/discoveries` (design §8, Req 13.4,
 * 13.8). Serupa recognition: `logical_request_id` stabil + micro-batch
 * `images[]`. `market` diturunkan server-side dari negara toko (tidak dipercaya
 * dari klien). Ability `scan.use` diperiksa di controller.
 */
class DiscoveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        /** @var Store $store */
        $store = $this->route('store');
        $this->merge([
            'market' => strtoupper($store->country->code),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $maxImages = min(3, max(1, (int) config('services.catalog_intelligence.max_images')));

        return [
            'logical_request_id' => ['required', 'string', 'max:190'],
            'images' => ['required', 'array', 'min:1', 'max:'.$maxImages],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'market' => ['required', 'string', 'size:2'],
        ];
    }
}
