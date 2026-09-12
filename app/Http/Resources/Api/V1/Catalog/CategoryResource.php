<?php

namespace App\Http\Resources\Api\V1\Catalog;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi kategori untuk Api_V1 (Req 9). Identifier publik = ULID; integer
 * id internal tidak diekspos.
 *
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
