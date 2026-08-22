<?php

namespace App\Http\Requests\Scanner;

use App\Enums\ProductScannerPurpose;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DiscoverCatalogItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('manageMasterData', app(CurrentStore::class)->get()) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'purpose' => ['required', Rule::in([ProductScannerPurpose::Product->value])],
            'images' => ['required', 'array', 'min:1', 'max:'.config('services.catalog_intelligence.max_images')],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'market' => ['required', Rule::in(['ID', 'MY'])],
        ];
    }
}
