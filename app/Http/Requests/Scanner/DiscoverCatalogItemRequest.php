<?php

namespace App\Http\Requests\Scanner;

use App\Enums\ProductScannerPurpose;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DiscoverCatalogItemRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $country = app(CurrentStore::class)->get()->country;
        $this->merge([
            'market' => strtoupper($country->code),
            'currency' => strtoupper($country->currency_code),
            'language' => app()->getLocale(),
        ]);
    }

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
            'scan_request_id' => ['required', 'uuid'],
            'images' => ['required', 'array', 'min:1', 'max:'.min(3, max(1, (int) config('services.catalog_intelligence.max_images')))],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'market' => ['required', Rule::in(['ID', 'MY', 'SG', 'TH', 'VN', 'PH', 'BN', 'KH', 'LA', 'MM', 'TL'])],
            'language' => ['required', Rule::in(['id', 'en', 'ms', 'vi'])],
            'currency' => ['required', Rule::in(['IDR', 'MYR', 'SGD', 'THB', 'VND', 'PHP', 'BND', 'KHR', 'LAK', 'MMK', 'USD'])],
        ];
    }
}
