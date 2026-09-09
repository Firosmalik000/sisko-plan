<?php

namespace App\Http\Requests\MasterData;

use App\Enums\UnitType;
use App\Models\Unit;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class UnitRequest extends MasterDataRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->has('name_is_custom')) {
            $existing = Unit::query()->where('store_id', app(CurrentStore::class)->id())
                ->where('public_id', $this->route('unit'))->first();
            if ($existing === null || $existing->name !== $this->input('name')) {
                $this->merge(['name_is_custom' => true]);
            }
        }
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $unitId = $this->routeModelId('units', 'unit');

        $existing = $unitId === null ? null : Unit::query()->where('store_id', $storeId)->find($unitId);
        $role = $this->input('unit_type') === UnitType::Retail->value ? 'sale' : 'large';

        return [
            'name' => ['required', 'string', 'max:80', Rule::unique('units')->where('store_id', $storeId)->ignore($unitId)],
            'symbol' => ['required', 'string', 'max:20', Rule::unique('units')->where('store_id', $storeId)->ignore($unitId)],
            'unit_type' => ['required', Rule::enum(UnitType::class)],
            'reference_code' => [Rule::requiredIf(fn () => $this->has('name_is_custom') && ! $this->boolean('name_is_custom')), 'nullable', 'string', Rule::exists('unit_references', 'code')->where(function ($query) use ($existing, $role): void {
                $query->whereJsonContains('roles', $role);
                if ($existing?->reference_code !== $this->input('reference_code')) {
                    $query->where('is_active', true);
                }
            })],
            'name_is_custom' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
