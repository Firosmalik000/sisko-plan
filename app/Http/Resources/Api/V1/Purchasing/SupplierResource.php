<?php

namespace App\Http\Resources\Api\V1\Purchasing;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi supplier privat toko untuk Api_V1 (Req 12). Domain Purchasing;
 * tidak dicampur dengan katalog distributor platform (Req 32.4).
 *
 * @mixin Supplier
 */
class SupplierResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'contact_person' => $this->contact_person,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
