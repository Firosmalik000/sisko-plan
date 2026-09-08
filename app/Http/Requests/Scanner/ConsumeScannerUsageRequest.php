<?php

namespace App\Http\Requests\Scanner;

use App\Enums\ProductScannerPurpose;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConsumeScannerUsageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $purpose = ProductScannerPurpose::tryFrom((string) $this->input('purpose'));

        return $purpose !== null && $this->user()?->can($purpose->ability(), app(CurrentStore::class)->get()) === true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return ['purpose' => ['required', Rule::enum(ProductScannerPurpose::class)]];
    }
}
