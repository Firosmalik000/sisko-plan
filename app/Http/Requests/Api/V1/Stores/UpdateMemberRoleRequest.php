<?php

namespace App\Http\Requests\Api\V1\Stores;

use App\Enums\MembershipRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi perubahan role anggota (PATCH /stores/{store}/members/{member},
 * Req 22.3). Role terbatas admin/cashier — mempromosikan ke owner atau mengubah
 * owner ditolak `OWNERSHIP_LOCKED` di controller.
 */
class UpdateMemberRoleRequest extends FormRequest
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
            'role' => ['required', Rule::in([MembershipRole::Admin->value, MembershipRole::Cashier->value])],
        ];
    }
}
