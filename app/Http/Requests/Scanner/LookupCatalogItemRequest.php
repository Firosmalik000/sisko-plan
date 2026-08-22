<?php

namespace App\Http\Requests\Scanner;

use App\Enums\ProductScannerPurpose;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LookupCatalogItemRequest extends FormRequest
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
            'type' => ['required', Rule::in(['sku', 'barcode'])],
            'identifier' => ['required', 'string', 'max:160'],
            'capture_id' => ['nullable', 'string', 'max:80'],
        ];
    }
}
