<?php

namespace App\Http\Requests\Scanner;

use App\Enums\ProductScannerPurpose;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RecognizeCatalogItemsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $purpose = ProductScannerPurpose::tryFrom((string) $this->input('purpose'));

        return $purpose !== null && $this->user()?->can($purpose->ability(), app(CurrentStore::class)->get()) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'purpose' => ['required', Rule::enum(ProductScannerPurpose::class)],
            'images' => ['required', 'array', 'min:1', 'max:'.config('services.catalog_intelligence.max_images')],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'capture_ids' => ['nullable', 'array'],
            'capture_ids.*' => ['string', 'max:80'],
        ];
    }
}
