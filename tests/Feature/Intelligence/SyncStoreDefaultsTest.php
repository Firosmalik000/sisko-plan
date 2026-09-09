<?php

namespace Tests\Feature\Intelligence;

use App\Actions\Stores\SeedStoreStarterData;
use App\Models\CategoryReference;
use App\Models\Store;
use App\Models\UnitReference;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncStoreDefaultsTest extends TestCase
{
    use RefreshDatabase;

    private function catalog(): void
    {
        foreach (SeedStoreStarterData::CATEGORIES as $code => $name) {
            CategoryReference::create(['code' => $code, 'name' => $name, 'catalog_version' => 'v1', 'is_active' => true]);
        }
        foreach (SeedStoreStarterData::UNITS as $unit) {
            if ($unit['reference'] !== null) {
                UnitReference::firstOrCreate(['code' => $unit['reference']], ['name' => $unit['name'], 'symbol' => $unit['symbol'], 'roles' => $unit['reference'] === 'pack' ? ['sale', 'large'] : [$unit['type']->value === 'retail' ? 'sale' : 'large'], 'dimension' => 'count', 'allows_fraction' => false, 'is_active' => true, 'catalog_version' => 'v1']);
            }
        }
    }

    public function test_all_catalog_entries_are_defaults_for_sync_and_new_stores(): void
    {
        $this->catalog();
        CategoryReference::create(['code' => 'networking_equipment', 'name' => 'Networking equipment', 'catalog_version' => 'v1', 'is_active' => true]);
        UnitReference::create(['code' => 'meter', 'name' => 'Meter', 'symbol' => 'm', 'roles' => ['sale', 'measurement'], 'dimension' => 'length', 'allows_fraction' => true, 'is_active' => true, 'catalog_version' => 'v1']);
        $store = Store::factory()->create();
        app(SeedStoreStarterData::class)->syncReferences($store, app(SeedStoreStarterData::class)->referenceDefaults());
        $this->assertTrue($store->categories()->where('reference_code', 'networking_equipment')->exists());
        $this->assertTrue($store->units()->where('reference_code', 'meter')->where('unit_type', 'retail')->exists());
        $other = Store::factory()->create();
        app(SeedStoreStarterData::class)->handle($other);
        $this->assertTrue($other->categories()->where('reference_code', 'networking_equipment')->exists());
        $this->assertTrue($other->units()->where('reference_code', 'meter')->exists());
    }

    public function test_conflicts_and_custom_symbols_are_preserved(): void
    {
        $this->catalog();
        $store = Store::factory()->create();
        $category = $store->categories()->create(['name' => 'Minuman']);
        $unit = $store->units()->create(['name' => 'My unit', 'symbol' => 'custom', 'unit_type' => 'retail', 'reference_code' => 'piece', 'name_is_custom' => true, 'is_active' => false]);
        $starter = app(SeedStoreStarterData::class);
        $conflicts = $starter->syncReferences($store, $starter->referenceDefaults());
        $this->assertContains('categories:beverages', $conflicts);
        $this->assertNull($category->refresh()->reference_code);
        $this->assertSame('custom', $unit->refresh()->symbol);
        $this->assertFalse($unit->is_active);
        $this->assertTrue($unit->name_is_custom);
        $this->assertSame(1, $store->units()->where('reference_code', 'piece')->count());
    }
}
