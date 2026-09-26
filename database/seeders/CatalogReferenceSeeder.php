<?php

namespace Database\Seeders;

use App\Actions\Stores\SeedStoreStarterData;
use App\Models\Category;
use App\Models\CategoryReference;
use App\Models\Unit;
use App\Models\UnitReference;
use Illuminate\Database\Seeder;

class CatalogReferenceSeeder extends Seeder
{
    /** @var array<string, string> */
    public const ADDITIONAL_CATEGORIES = [
        'agriculture' => 'Agriculture',
        'apparel' => 'Apparel',
        'automotive' => 'Automotive',
        'baby' => 'Baby',
        'bags_accessories' => 'Bags & accessories',
        'bakery' => 'Bakery',
        'beauty' => 'Beauty',
        'books_media' => 'Books & media',
        'confectionery' => 'Confectionery',
        'connectivity_plans' => 'Connectivity plans',
        'dairy_eggs' => 'Dairy & eggs',
        'electronic_accessories' => 'Electronic accessories',
        'electronics' => 'Electronics',
        'footwear' => 'Footwear',
        'fresh_produce' => 'Fresh produce',
        'frozen' => 'Frozen food',
        'gifts' => 'Gifts',
        'hardware_tools' => 'Hardware & tools',
        'health' => 'Health',
        'household' => 'Household',
        'installation_services' => 'Installation services',
        'meat_seafood' => 'Meat & seafood',
        'networking_equipment' => 'Networking equipment',
        'other' => 'Other',
        'pet' => 'Pets',
        'sim_cards' => 'SIM cards',
        'software_subscriptions' => 'Software subscriptions',
        'sports_outdoor' => 'Sports & outdoor',
        'stationery' => 'Stationery',
        'toys_games' => 'Toys & games',
        'tracking_devices' => 'Tracking devices',
    ];

    public function run(): void
    {
        foreach (SeedStoreStarterData::CATEGORIES as $code => $name) {
            CategoryReference::updateOrCreate(['code' => $code], [
                'name' => $name,
                'catalog_version' => 'v1',
                'is_active' => true,
            ]);
        }

        foreach (self::ADDITIONAL_CATEGORIES as $code => $name) {
            CategoryReference::updateOrCreate(['code' => $code], [
                'name' => $name,
                'catalog_version' => 'v1',
                'is_active' => true,
            ]);
        }

        foreach (SeedStoreStarterData::UNITS as $unit) {
            if ($unit['reference'] !== null) {
                UnitReference::updateOrCreate(['code' => $unit['reference']], [
                    'name' => $unit['name'],
                    'symbol' => $unit['symbol'],
                    'roles' => $unit['reference'] === 'pack' ? ['sale', 'large'] : [$unit['type']->value === 'retail' ? 'sale' : 'large'],
                    'dimension' => 'count',
                    'allows_fraction' => false,
                    'is_active' => true,
                    'catalog_version' => 'v1',
                ]);
            }
        }

        foreach (SeedStoreStarterData::CATEGORIES as $code => $name) {
            Category::query()->where('name', $name)->whereNull('reference_code')->update([
                'reference_code' => $code,
                'name_is_custom' => false,
            ]);
        }

        foreach (SeedStoreStarterData::UNITS as $starter) {
            if ($starter['reference'] !== null) {
                Unit::query()->where('name', $starter['name'])
                    ->where('symbol', $starter['symbol'])
                    ->whereNull('reference_code')
                    ->update([
                        'reference_code' => $starter['reference'],
                        'name_is_custom' => false,
                    ]);
            }
        }
    }
}
