<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi kategori pengeluaran (Req 19.1). CRUD murni identitas kategori (tanpa
 * ledger) → controller tipis + Eloquent. DELETE = soft-deactivate (`is_active`).
 */
class SaveExpenseCategoryRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
