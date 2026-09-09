<?php

namespace Tests\Feature\Intelligence;

use App\Models\Store;
use App\Models\Unit;
use App\Models\UnitReference;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncUnitReferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_populates_stores_even_at_same_version_and_preserves_edits(): void
    {
        Http::fake(['*' => Http::response($this->payload())]);
        $store = Store::factory()->create();
        $this->artisan('intelligence:sync-units')->assertSuccessful();
        $row = $store->units()->where('reference_code', 'bottle')->sole();
        $row->update(['name' => 'Custom bottle', 'name_is_custom' => true, 'is_active' => false]);
        $other = Store::factory()->create();
        $this->artisan('intelligence:sync-units')->assertSuccessful();
        $this->assertSame(1, $store->units()->count());
        $this->assertSame('Custom bottle', $row->refresh()->name);
        $this->assertFalse($row->is_active);
        $this->assertTrue($row->name_is_custom);
        $this->assertSame(1, $other->units()->where('reference_code', 'bottle')->count());
    }

    public function test_failed_store_rolls_back_and_later_stores_continue_then_retry(): void
    {
        Http::fake(['*' => Http::response($this->payload())]);
        $first = Store::factory()->create();
        $second = Store::factory()->create();
        $fail = true;
        Unit::creating(function ($row) use ($first, &$fail): void {
            if ($fail && $row->store_id === $first->id) {
                throw new \RuntimeException('Simulated store failure');
            }
        });
        try {
            $this->artisan('intelligence:sync-units')->assertFailed();
            $this->assertSame(0, $first->units()->count());
            $this->assertSame(1, $second->units()->count());
            $fail = false;
            $this->artisan('intelligence:sync-units')->assertSuccessful();
            $this->assertSame(1, $first->units()->count());
            $this->assertSame(1, $second->units()->count());
        } finally {
            $fail = false;
        }
    }

    public function test_import_is_durable_and_unchanged_version_does_not_rewrite_rows(): void
    {
        Http::fake(['*' => Http::response($this->payload())]);
        $this->artisan('intelligence:sync-units')->assertSuccessful();
        $this->assertDatabaseHas('unit_references', ['code' => 'bottle', 'catalog_version' => 'v1']);
        UnitReference::query()->where('code', 'bottle')->update(['name' => 'Existing']);
        $this->artisan('intelligence:sync-units')->assertSuccessful();
        $this->assertDatabaseHas('unit_references', ['code' => 'bottle', 'name' => 'Existing']);
    }

    public function test_invalid_imports_and_timeout_preserve_previous_catalog(): void
    {
        Http::fake(['*' => Http::response($this->payload())]);
        $this->artisan('intelligence:sync-units')->assertSuccessful();
        $duplicate = $this->payload();
        $duplicate['data'][] = $duplicate['data'][0];
        foreach ([$duplicate, ['status' => 'success', 'catalog_version' => 'v2', 'data' => []], ['status' => 'success', 'data' => 'bad']] as $payload) {
            Http::swap(new Factory);
            Http::fake(['*' => Http::response($payload)]);
            $this->artisan('intelligence:sync-units')->assertFailed();
            $this->assertDatabaseCount('unit_references', 1);
            $this->assertDatabaseHas('unit_references', ['code' => 'bottle', 'catalog_version' => 'v1']);
        }
        Http::swap(new Factory);
        Http::fake(['*' => Http::failedConnection()]);
        $this->artisan('intelligence:sync-units')->assertFailed();
        $this->assertDatabaseCount('unit_references', 1);
    }

    public function test_concurrent_sync_does_not_fetch_or_change_catalog(): void
    {
        Http::fake();
        $lock = Cache::lock('intelligence:sync-units', 300);
        $lock->get();
        try {
            $this->artisan('intelligence:sync-units')->assertFailed();
            Http::assertNothingSent();
        } finally {
            $lock->release();
        }
    }

    private function payload(): array
    {
        return ['status' => 'success', 'message' => 'OK', 'catalog_version' => 'v1', 'data' => [
            ['code' => 'bottle', 'name' => 'Bottle', 'symbol' => 'btl', 'roles' => ['sale'], 'dimension' => 'count', 'allows_fraction' => false, 'is_active' => true],
        ]];
    }
}
