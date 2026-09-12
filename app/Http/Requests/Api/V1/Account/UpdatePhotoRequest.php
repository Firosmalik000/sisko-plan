<?php

namespace App\Http\Requests\Api\V1\Account;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi unggah foto profil (POST /me/photo, Req 25.3). Multipart image; batas
 * ukuran/tipe menjaga penyimpanan. Disimpan pada disk `local` (konsisten dengan
 * jalur web `profile.photo`).
 */
class UpdatePhotoRequest extends FormRequest
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
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }
}
