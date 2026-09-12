<?php

namespace App\Http\Resources\Api\V1\Finance;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi kategori pengeluaran (Req 19.1). Identifier publik ULID.
 *
 * @mixin ExpenseCategory
 */
class ExpenseCategoryResource extends JsonResource
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
