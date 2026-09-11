<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi toko untuk Api_V1 (design §3). Identifier publik = ULID
 * (Store::public_id); integer id internal tidak diekspos. Menyertakan role &
 * status membership pengguna saat ini dari pivot bila tersedia.
 *
 * @mixin Store
 */
class StoreResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'status' => $this->status->value,
        ];

        if ($this->pivot !== null) {
            $data['membership'] = [
                'role' => $this->pivot->role,
                'status' => $this->pivot->status,
            ];
        }

        return $data;
    }
}
