<?php

namespace App\Http\Requests\MasterData;

use App\Enums\UnitType;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class UnitRequest extends MasterDataRequest
{
    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $unitId = $this->routeModelId('units', 'unit');

        return [
            'name' => ['required', 'string', 'max:80', Rule::unique('units')->where('store_id', $storeId)->ignore($unitId)],
            'symbol' => ['required', 'string', 'max:20', Rule::unique('units')->where('store_id', $storeId)->ignore($unitId)],
            'unit_type' => ['required', Rule::enum(UnitType::class)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
