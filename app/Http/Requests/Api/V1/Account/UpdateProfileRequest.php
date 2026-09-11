<?php

namespace App\Http\Requests\Api\V1\Account;

use App\Rules\UnicodeSafeText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi `PATCH /me/profile` (Req 21.1, 21.3).
 *
 * Mengizinkan ubah `name` (mendukung Unicode lokal, tolak karakter kontrol/
 * injeksi) dan `email` (unik selain diri sendiri). Field opsional (`sometimes`)
 * agar update parsial diperbolehkan. Auth via `auth:sanctum`; controller cukup
 * memperbarui atribut user aktif tanpa Action baru.
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $userId = $this->user()?->getAuthIdentifier();

        return [
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:160', new UnicodeSafeText],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email:rfc',
                'max:254',
                Rule::unique('users', 'email')->ignore($userId),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if (is_string($this->input('name'))) {
            $merge['name'] = trim($this->input('name'));
        }

        if (is_string($this->input('email'))) {
            $merge['email'] = trim($this->input('email'));
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }
}
