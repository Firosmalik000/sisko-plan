<?php

namespace App\Http\Requests\Api\V1\Account;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Validasi ganti kata sandi terautentikasi (POST /me/password, Req 26.1).
 * `current_password` diverifikasi terhadap kata sandi aktif; `password` mengikuti
 * aturan kekuatan default aplikasi + konfirmasi. Nilai tidak pernah masuk log.
 */
class UpdatePasswordRequest extends FormRequest
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
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }
}
