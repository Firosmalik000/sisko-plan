<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi pendaftaran akun mobile (POST /auth/register, Req 3).
 *
 * Reuse aturan profil + kekuatan password terpusat agar identik dengan alur web
 * (Req 3.5). `confirmed` menuntut field `password_confirmation`.
 */
class RegisterRequest extends FormRequest
{
    use PasswordValidationRules, ProfileValidationRules;

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
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'device_id' => ['required', 'string', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
