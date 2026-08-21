<?php

namespace App\Actions\Stores;

use App\Enums\UnitType;
use App\Models\Store;
use App\Models\Unit;

class SeedStoreStarterData
{
    /** @var list<string> */
    private const CATEGORIES = [
        'Minuman',
        'Makanan',
        'Snack',
        'Rokok',
        'Bumbu Dapur',
        'Kebutuhan Mandi',
        'Pembersih',
        'Obat',
    ];

    /** @var list<array{name: string, symbol: string, type: UnitType}> */
    private const UNITS = [
        ['name' => 'Dus', 'symbol' => 'dus', 'type' => UnitType::Large],
        ['name' => 'Lusin', 'symbol' => 'lusin', 'type' => UnitType::Large],
        ['name' => 'Slop', 'symbol' => 'slop', 'type' => UnitType::Large],
        ['name' => 'Renceng', 'symbol' => 'renceng', 'type' => UnitType::Large],
        ['name' => 'Karung', 'symbol' => 'karung', 'type' => UnitType::Large],
        ['name' => 'Krat', 'symbol' => 'krat', 'type' => UnitType::Large],
        ['name' => 'Drum', 'symbol' => 'drum', 'type' => UnitType::Large],
        ['name' => 'Jerigen', 'symbol' => 'jerigen', 'type' => UnitType::Large],
        ['name' => 'Pack', 'symbol' => 'pack', 'type' => UnitType::Large],
        ['name' => 'Kodi', 'symbol' => 'kodi', 'type' => UnitType::Large],
        ['name' => 'Pcs', 'symbol' => 'pcs', 'type' => UnitType::Retail],
        ['name' => 'Kilogram', 'symbol' => 'kg', 'type' => UnitType::Retail],
        ['name' => 'Gram', 'symbol' => 'g', 'type' => UnitType::Retail],
        ['name' => 'Bungkus', 'symbol' => 'bks', 'type' => UnitType::Retail],
        ['name' => 'Sachet', 'symbol' => 'sachet', 'type' => UnitType::Retail],
        ['name' => 'Butir', 'symbol' => 'butir', 'type' => UnitType::Retail],
        ['name' => 'Botol', 'symbol' => 'btl', 'type' => UnitType::Retail],
        ['name' => 'Liter', 'symbol' => 'l', 'type' => UnitType::Retail],
        ['name' => 'Ikat', 'symbol' => 'ikat', 'type' => UnitType::Retail],
    ];

    public function handle(Store $store): void
    {
        foreach (self::CATEGORIES as $name) {
            $store->categories()->firstOrCreate(['name' => $name]);
        }

        foreach (self::UNITS as $starter) {
            $unit = Unit::query()
                ->where('store_id', $store->id)
                ->where(fn ($query) => $query
                    ->where('name', $starter['name'])
                    ->orWhere('symbol', $starter['symbol']))
                ->first();

            if ($unit) {
                $unit->update(['unit_type' => $starter['type']]);

                continue;
            }

            $store->units()->create([
                'name' => $starter['name'],
                'symbol' => $starter['symbol'],
                'unit_type' => $starter['type'],
            ]);
        }
    }
}
