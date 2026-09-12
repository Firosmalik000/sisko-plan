<?php

namespace App\Http\Resources\Api\V1\Stores;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi anggota toko (Req 22.1). Identitas pengguna publik + role/status
 * membership dari pivot `store_memberships`. Integer id internal tidak diekspos.
 *
 * @mixin User
 */
class MemberResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->pivot->role,
            'status' => $this->pivot->status,
        ];
    }
}
