<?php

namespace App\Http\Requests\Api\V1\Stores;

use App\Rules\UnicodeSafeText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi `PATCH /stores/{store}/settings` (Req 21.2, 21.3).
 *
 * Owner mengubah identitas toko (`name` via Store) + identitas/struk pada
 * StoreSetting (address, phone, email, timezone, currency, locale, receipt
 * header/footer, theme_color). Field teks bebas mendukung Unicode lokal namun menolak
 * karakter kontrol/injeksi ({@see UnicodeSafeText}). Membership + tenant sudah
 * divalidasi middleware `store.membership`; ability `store.settings` dicek
 * controller sebelum FormRequest.
 */
class UpdateStoreSettingsRequest extends FormRequest
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
        return [
            // Identitas toko (Store model).
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:160', new UnicodeSafeText],

            // Identitas & lokal (StoreSetting).
            'phone' => ['sometimes', 'nullable', 'string', 'max:30', 'regex:/^\+?[0-9][0-9().\-\s]{4,29}$/'],
            'email' => ['sometimes', 'nullable', 'email:rfc', 'max:254'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500', new UnicodeSafeText(allowNewlines: true)],
            'timezone' => ['sometimes', 'required', 'string', 'max:50', Rule::in(timezone_identifiers_list())],
            'currency' => ['sometimes', 'required', 'string', 'size:3', 'regex:/^[A-Za-z]{3}$/'],
            'locale' => ['sometimes', 'required', 'string', 'max:10', 'regex:/^[a-zA-Z]{2,3}([_-][a-zA-Z0-9]{2,8})*$/'],

            // Struk.
            'receipt_header' => ['sometimes', 'nullable', 'string', 'max:120', new UnicodeSafeText(allowNewlines: true)],
            'receipt_footer' => ['sometimes', 'nullable', 'string', 'max:240', new UnicodeSafeText(allowNewlines: true)],
            'receipt_paper_size' => ['sometimes', 'required', Rule::in(['58mm', '80mm'])],
            'receipt_show_address' => ['sometimes', 'boolean'],
            'receipt_show_cashier' => ['sometimes', 'boolean'],
            'theme_color' => ['sometimes', 'required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        foreach (['name', 'phone', 'email', 'address', 'timezone', 'locale', 'receipt_header', 'receipt_footer'] as $key) {
            if (is_string($this->input($key))) {
                $trimmed = trim($this->input($key));
                $merge[$key] = $trimmed === '' ? null : $trimmed;
            }
        }

        if (is_string($this->input('currency'))) {
            $merge['currency'] = strtoupper(trim($this->input('currency')));
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.regex' => __('Nomor telepon toko tidak valid.'),
            'theme_color.regex' => __('Warna tema harus berupa kode heksadesimal seperti #ee4d2d.'),
        ];
    }
}
