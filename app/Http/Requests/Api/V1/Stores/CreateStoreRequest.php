<?php

namespace App\Http\Requests\Api\V1\Stores;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi pembuatan toko baru (POST /stores, Req 21.2, 22.1). Currency/timezone
 * diturunkan dari negara (`country_code`) oleh `CreateStore` action. `address`
 * disimpan pada StoreSetting.
 */
class CreateStoreRequest extends FormRequest
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
            'country_code' => ['nullable', 'string', 'size:2'],
            'address' => ['nullable', 'string', 'max:500'],
        ];
    }
}
