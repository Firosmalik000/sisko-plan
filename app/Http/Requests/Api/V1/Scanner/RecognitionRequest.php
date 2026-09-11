<?php

namespace App\Http\Requests\Api\V1\Scanner;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi `POST /stores/{store}/scanner/recognitions` (design §8, Req 13.4,
 * 13.8). Kontrak API mobile: `logical_request_id` (stabil lintas retry, menjadi
 * requestKey kuota agar tidak terpotong dua kali) + micro-batch `images[]`
 * (maksimum mengikuti `services.catalog_intelligence.max_images`). Ability
 * `scan.use` diperiksa di controller (fast gate + authoritative).
 */
class RecognitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $maxImages = min(5, max(1, (int) config('services.catalog_intelligence.max_images')));

        return [
            'logical_request_id' => ['required', 'string', 'max:190'],
            'images' => ['required', 'array', 'min:1', 'max:'.$maxImages],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'capture_ids' => ['nullable', 'array'],
            'capture_ids.*' => ['string', 'max:80'],
        ];
    }
}
