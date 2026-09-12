<?php

namespace App\Http\Requests\Api\V1\Stores;

use App\Enums\MembershipRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi penambahan anggota toko (POST /stores/{store}/members, Req 22.2).
 * Anggota diidentifikasi via email pengguna terdaftar. Role terbatas admin/cashier
 * (owner tak bisa ditambah lewat endpoint ini → OWNERSHIP_LOCKED di controller).
 */
class StoreMemberRequest extends FormRequest
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
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in([MembershipRole::Admin->value, MembershipRole::Cashier->value])],
        ];
    }
}
