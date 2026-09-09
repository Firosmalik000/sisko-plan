<?php

namespace App\Actions\Stores;

use App\Enums\UnitType;
use App\Models\CategoryReference;
use App\Models\Store;
use App\Models\Unit;
use App\Models\UnitReference;
use Illuminate\Support\Facades\DB;

class SeedStoreStarterData
{
    /** @var array<string, string> */
    public const CATEGORIES = [
        'beverages' => 'Minuman',
        'prepared_food' => 'Makanan',
        'snacks' => 'Snack',
        'tobacco' => 'Rokok',
        'grocery' => 'Bumbu Dapur',
        'personal_care' => 'Kebutuhan Mandi',
        'cleaning_supplies' => 'Pembersih',
        'medicine' => 'Obat',
    ];

    /** @var list<array{name: string, symbol: string, type: UnitType, reference: string|null}> */
    public const UNITS = [
        ['name' => 'Dus', 'symbol' => 'dus', 'type' => UnitType::Large, 'reference' => 'carton'],
        ['name' => 'Lusin', 'symbol' => 'lusin', 'type' => UnitType::Large, 'reference' => 'dozen'],
        ['name' => 'Slop', 'symbol' => 'slop', 'type' => UnitType::Large, 'reference' => 'cigarette_carton'],
        ['name' => 'Renceng', 'symbol' => 'renceng', 'type' => UnitType::Large, 'reference' => 'hanging_strip'],
        ['name' => 'Karung', 'symbol' => 'karung', 'type' => UnitType::Large, 'reference' => 'sack'],
        ['name' => 'Krat', 'symbol' => 'krat', 'type' => UnitType::Large, 'reference' => 'crate'],
        ['name' => 'Drum', 'symbol' => 'drum', 'type' => UnitType::Large, 'reference' => 'drum'],
        ['name' => 'Jerigen', 'symbol' => 'jerigen', 'type' => UnitType::Large, 'reference' => 'jerrycan'],
        ['name' => 'Pack', 'symbol' => 'pack', 'type' => UnitType::Large, 'reference' => 'pack'],
        ['name' => 'Kodi', 'symbol' => 'kodi', 'type' => UnitType::Large, 'reference' => 'score'],
        ['name' => 'Pcs', 'symbol' => 'pcs', 'type' => UnitType::Retail, 'reference' => 'piece'],
        ['name' => 'Kilogram', 'symbol' => 'kg', 'type' => UnitType::Retail, 'reference' => 'kilogram'],
        ['name' => 'Gram', 'symbol' => 'g', 'type' => UnitType::Retail, 'reference' => 'gram'],
        ['name' => 'Bungkus', 'symbol' => 'bks', 'type' => UnitType::Retail, 'reference' => 'packet'],
        ['name' => 'Sachet', 'symbol' => 'sachet', 'type' => UnitType::Retail, 'reference' => 'sachet'],
        ['name' => 'Butir', 'symbol' => 'butir', 'type' => UnitType::Retail, 'reference' => 'piece'],
        ['name' => 'Botol', 'symbol' => 'btl', 'type' => UnitType::Retail, 'reference' => 'bottle'],
        ['name' => 'Liter', 'symbol' => 'l', 'type' => UnitType::Retail, 'reference' => 'liter'],
        ['name' => 'Ikat', 'symbol' => 'ikat', 'type' => UnitType::Retail, 'reference' => null],
    ];

    /** @return array{categories: list<array<string, mixed>>, units: list<array<string, mixed>>} */
    public function referenceDefaults(): array
    {
        $defaults = ['categories' => [], 'units' => []];
        foreach (CategoryReference::query()->where('is_active', true)->orderBy('code')->get() as $reference) {
            $defaults['categories'][] = ['reference_code' => $reference->code, 'name' => $reference->name, 'name_is_custom' => false];
        }
        foreach (UnitReference::query()->where('is_active', true)->orderBy('code')->get() as $reference) {
            foreach (['sale' => UnitType::Retail, 'large' => UnitType::Large] as $role => $type) {
                if (! in_array($role, $reference->roles, true)) {
                    continue;
                }
                $dualRole = in_array('sale', $reference->roles, true) && in_array('large', $reference->roles, true);
                $defaults['units'][] = [
                    'reference_code' => $reference->code,
                    'name' => $reference->name.($dualRole && $type === UnitType::Retail ? ' (retail)' : ''),
                    'symbol' => ($reference->code === 'hanging_strip' ? 'hanging-strip' : $reference->symbol).($dualRole && $type === UnitType::Retail ? '-sale' : ''),
                    'unit_type' => $type->value,
                    'name_is_custom' => false,
                ];
            }
        }

        return $defaults;
    }

    public function handle(Store $store): void
    {
        $categoryCodes = CategoryReference::query()->where('is_active', true)->pluck('code');
        foreach (self::CATEGORIES as $code => $name) {
            $store->categories()->firstOrCreate(['name' => $name], [
                'reference_code' => $categoryCodes->contains($code) ? $code : null,
                'name_is_custom' => ! $categoryCodes->contains($code),
            ]);
        }

        $references = UnitReference::query()->where('is_active', true)->get()->keyBy('code');
        foreach (self::UNITS as $starter) {
            $unit = Unit::query()
                ->where('store_id', $store->id)
                ->where(fn ($query) => $query
                    ->where('name', $starter['name'])
                    ->orWhere('symbol', $starter['symbol']))
                ->first();

            if ($unit) {
                continue;
            }

            $reference = $starter['reference'] === null ? null : $references->get($starter['reference']);
            $role = $starter['type'] === UnitType::Retail ? 'sale' : 'large';
            $referenceCode = $reference !== null && in_array($role, $reference->roles, true) ? $reference->code : null;
            if ($referenceCode !== null && $store->units()->where('reference_code', $referenceCode)->where('unit_type', $starter['type'])->exists()) {
                continue;
            }
            $store->units()->create([
                'reference_code' => $referenceCode,
                'name_is_custom' => $referenceCode === null,
                'name' => $starter['name'],
                'symbol' => $starter['symbol'],
                'unit_type' => $starter['type'],
            ]);
        }
        $this->syncReferences($store, $this->referenceDefaults());
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $catalog
     * @return list<string>
     */
    public function syncReferences(Store $store, array $catalog): array
    {
        return DB::transaction(function () use ($store, $catalog): array {
            $store = Store::query()->lockForUpdate()->findOrFail($store->id);
            $conflicts = [];
            foreach ($catalog as $kind => $defaults) {
                $relation = $kind === 'categories' ? $store->categories() : $store->units();
                foreach ($defaults as $default) {
                    $mapped = $relation->getQuery()->clone()->where('reference_code', $default['reference_code']);
                    if (isset($default['unit_type'])) {
                        $mapped->where('unit_type', $default['unit_type']);
                    }
                    if ($mapped->exists()) {
                        continue;
                    }
                    $conflict = $relation->getQuery()->clone()->where(function ($query) use ($default): void {
                        $query->where('name', $default['name']);
                        if (isset($default['symbol'])) {
                            $query->orWhere('symbol', $default['symbol']);
                        }
                    })->exists();
                    if (! $conflict) {
                        $relation->create($default);
                    } else {
                        $conflicts[] = $kind.':'.$default['reference_code'];
                    }
                }
            }

            return $conflicts;
        });
    }
}
