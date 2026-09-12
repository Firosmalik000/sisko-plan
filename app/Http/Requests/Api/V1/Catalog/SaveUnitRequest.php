<?php

namespace App\Http\Requests\Api\V1\Catalog;

use App\Enums\UnitType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi create/update unit/satuan (Req 10.2). PATCH mengizinkan field parsial.
 */
class SaveUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:255'],
            'symbol' => ['nullable', 'string', 'max:20'],
            'unit_type' => [$required, Rule::enum(UnitType::class)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
