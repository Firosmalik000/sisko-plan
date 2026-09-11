<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi request login sosial (Google/Apple) mobile.
 *
 * `identity_token` adalah credential yang diverifikasi server-side; email/nama
 * dari client tidak dijadikan bukti identitas (Req 3.3).
 */
class SocialTokenRequest extends FormRequest
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
            'identity_token' => ['required', 'string'],
            'device_id' => ['required', 'string', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Terima alias `id_token` untuk kenyamanan client.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->has('identity_token') && $this->has('id_token')) {
            $this->merge(['identity_token' => $this->input('id_token')]);
        }
    }
}
