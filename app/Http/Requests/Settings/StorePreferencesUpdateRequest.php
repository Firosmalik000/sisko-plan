<?php

namespace App\Http\Requests\Settings;

use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;

class StorePreferencesUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', app(CurrentStore::class)->get()) ?? false;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'store_name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email:rfc', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'receipt_header' => ['nullable', 'string', 'max:120'],
            'receipt_footer' => ['nullable', 'string', 'max:240'],
            'receipt_paper_size' => ['required', 'in:58mm,80mm'],
            'receipt_show_address' => ['required', 'boolean'],
            'receipt_show_cashier' => ['required', 'boolean'],
            'printer_name' => ['nullable', 'string', 'max:120'],
            'auto_print_receipt' => ['required', 'boolean'],
            'receipt_copies' => ['required', 'integer', 'between:1,3'],
            'theme_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }
}
