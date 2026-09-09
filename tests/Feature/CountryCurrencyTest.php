<?php

namespace Tests\Feature;

use App\Enums\StoreStatus;
use App\Models\Country;
use App\Models\Currency;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Support\PlatformPermission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CountryCurrencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_country_is_freely_selected_and_currency_is_snapshotted(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)
            ->withSession(['market' => 'id', 'locale' => 'id'])
            ->post(route('stores.store'), ['name' => 'Toko Vietnam', 'country' => 'VN'])
            ->assertRedirect(route('dashboard'))
            ->assertSessionHasNoErrors();

        $store = Store::query()->with(['country', 'settings'])->sole();
        $this->assertSame('VN', $store->country->code);
        $this->assertSame('VND', $store->settings->currency);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id, 'market' => 'id', 'locale' => 'en'])
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('locale', 'en')
                ->where('activeStore.country_code', 'VN')
                ->where('activeStore.currency_code', 'VND')
                ->where('activeStore.currency_symbol', '₫')
                ->where('activeStore.currency_decimal_places', 0));
    }

    public function test_country_mapping_changes_do_not_change_an_existing_store_currency(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post(route('stores.store'), [
            'name' => 'Toko Vietnam',
            'country' => 'VN',
        ]);
        $store = Store::query()->sole();
        Product::factory()->create(['store_id' => $store->id]);

        Country::query()->where('code', 'VN')->update(['currency_code' => 'THB']);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeStore.country_code', 'VN')
                ->where('activeStore.currency_code', 'VND')
                ->where('activeStore.currency_symbol', '₫')
                ->where('activeStore.currency_symbol_position', 'after'));
    }

    public function test_store_form_defaults_by_market_but_offers_every_active_country(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)
            ->withSession(['market' => 'ms', 'locale' => 'ms'])
            ->get(route('stores.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/stores/create')
                ->where('defaultCountry', 'MY')
                ->has('countries', 4)
                ->where('countries.3.code', 'VN')
                ->where('countries.3.currency.code', 'VND'));
    }

    public function test_store_form_falls_back_when_the_market_country_is_inactive(): void
    {
        $owner = User::factory()->create();
        Country::query()->where('code', 'MY')->update(['is_active' => false]);

        $this->actingAs($owner)
            ->withSession(['market' => 'ms', 'locale' => 'ms'])
            ->get(route('stores.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('defaultCountry', 'ID')
                ->has('countries', 3));
    }

    public function test_super_admin_can_manage_country_and_currency_masters_safely(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->post(route('super-admin.geography.currencies.store'), [
            'code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$',
            'decimal_places' => 2, 'symbol_position' => 'before',
        ])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post(route('super-admin.geography.countries.store'), [
            'code' => 'US', 'name_id' => 'Amerika Serikat', 'name_ms' => 'Amerika Syarikat',
            'name_en' => 'United States', 'currency_code' => 'USD',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('countries', ['code' => 'US', 'currency_code' => 'USD']);
        $this->assertDatabaseHas('admin_audit_logs', ['user_id' => $admin->id, 'action' => 'country.created']);

        $usd = Currency::query()->findOrFail('USD');
        $this->actingAs($admin)->patch(route('super-admin.geography.currencies.update', $usd), [
            'name' => 'US Dollar', 'symbol' => '$', 'decimal_places' => 2,
            'symbol_position' => 'before', 'is_active' => false,
        ])->assertSessionHasErrors('is_active');
        $this->assertTrue($usd->fresh()->is_active);
    }

    public function test_platform_admin_needs_manage_permission_to_change_geography(): void
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->syncPermissions([PlatformPermission::GEOGRAPHY_VIEW]);

        $this->actingAs($admin)
            ->get(route('super-admin.geography.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('can_manage', false));

        $this->actingAs($admin)->post(route('super-admin.geography.currencies.store'), [
            'code' => 'USD',
            'name' => 'US Dollar',
            'symbol' => '$',
            'decimal_places' => 2,
            'symbol_position' => 'before',
        ])->assertForbidden();

        $this->assertDatabaseMissing('currencies', ['code' => 'USD']);
    }

    public function test_inactive_country_cannot_be_used_for_a_new_store(): void
    {
        $owner = User::factory()->create();
        Country::query()->where('code', 'TH')->update(['is_active' => false]);

        $this->actingAs($owner)->post(route('stores.store'), [
            'name' => 'Toko Thailand', 'country' => 'TH',
        ])->assertSessionHasErrors('country');
        $this->assertDatabaseCount('stores', 0);
    }

    public function test_the_last_active_country_cannot_be_disabled(): void
    {
        $admin = User::factory()->superAdmin()->create();
        Country::query()->where('code', '!=', 'ID')->update(['is_active' => false]);
        $country = Country::query()->where('code', 'ID')->firstOrFail();

        $this->actingAs($admin)->patch(route('super-admin.geography.countries.update', $country), [
            'name_id' => $country->name_id,
            'name_ms' => $country->name_ms,
            'name_en' => $country->name_en,
            'currency_code' => $country->currency_code,
            'is_active' => false,
        ])->assertSessionHasErrors('is_active');

        $this->assertTrue($country->fresh()->is_active);
    }

    public function test_owner_can_see_and_change_store_country_before_operations_start(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post(route('stores.store'), [
            'name' => 'Toko Awal',
            'country' => 'ID',
        ]);
        $store = Store::query()->sole();
        Product::factory()->create(['store_id' => $store->id]);

        $this->actingAs($owner)->get(route('stores.show', $store))
            ->assertInertia(fn (Assert $page) => $page
                ->where('store.country_name', 'Indonesia')
                ->where('store.currency_code', 'IDR')
                ->where('store.country_editable', true));

        $this->actingAs($owner)->patch(route('stores.update', $store), [
            'name' => 'Toko Vietnam',
            'country' => 'VN',
        ])->assertSessionHasNoErrors();

        $store->refresh()->load(['country', 'settings']);
        $this->assertSame('VN', $store->country->code);
        $this->assertSame('VND', $store->settings->currency);
        $this->assertDatabaseHas('audit_logs', ['store_id' => $store->id, 'action' => 'store.updated']);
    }

    public function test_store_country_cannot_change_after_a_transaction_exists(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post(route('stores.store'), [
            'name' => 'Toko Berjalan',
            'country' => 'ID',
        ]);
        $store = Store::query()->sole();
        DB::table('stock_adjustments')->insert([
            'public_id' => (string) Str::ulid(),
            'store_id' => $store->id,
            'document_number' => 'ADJ-001',
            'type' => 'increase',
            'idempotency_key' => (string) Str::uuid(),
            'occurred_at' => now(),
            'created_by_user_id' => $owner->id,
            'posted_at' => now(),
            'created_at' => now(),
        ]);

        $this->actingAs($owner)->patch(route('stores.update', $store), [
            'name' => $store->name,
            'country' => 'MY',
        ])->assertSessionHasErrors('country');

        $this->assertSame('ID', $store->fresh()->country->code);
        $this->assertSame('IDR', $store->fresh()->settings->currency);
    }

    public function test_archiving_preserves_store_data_and_frees_the_store_slot(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post(route('stores.store'), [
            'name' => 'Toko Lama',
            'country' => 'ID',
        ]);
        $store = Store::query()->with('subscription.plan')->sole();
        $store->subscription->plan->update(['max_stores' => 1]);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->delete(route('stores.destroy', $store))
            ->assertRedirect(route('stores.index'));

        $this->assertSame(StoreStatus::Archived, $store->fresh()->status);
        $this->assertDatabaseHas('stores', ['id' => $store->id, 'name' => 'Toko Lama']);
        $this->assertNull(session('active_store_id'));

        $this->actingAs($owner)->post(route('stores.store'), [
            'name' => 'Toko Baru',
            'country' => 'MY',
        ])->assertRedirect(route('dashboard'));
        $this->assertDatabaseCount('stores', 2);
    }

    public function test_non_owner_cannot_archive_another_users_store(): void
    {
        $store = Store::factory()->create();
        $otherUser = User::factory()->create();

        $this->actingAs($otherUser)->delete(route('stores.destroy', $store))->assertForbidden();
        $this->assertSame(StoreStatus::Active, $store->fresh()->status);
    }

    public function test_owner_can_restore_an_archived_store_when_capacity_allows(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post(route('stores.store'), [
            'name' => 'Toko Lama',
            'country' => 'ID',
        ]);
        $store = Store::query()->sole();
        $this->actingAs($owner)->delete(route('stores.destroy', $store));

        $this->actingAs($owner)
            ->patch(route('stores.restore', $store))
            ->assertSessionHasNoErrors();

        $this->assertSame(StoreStatus::Active, $store->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['store_id' => $store->id, 'action' => 'store.restored']);
    }

    public function test_owner_can_permanently_delete_an_archived_store_with_exact_name_confirmation(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $this->actingAs($owner)->post(route('stores.store'), [
            'name' => 'Toko Tutup',
            'country' => 'ID',
        ]);
        $store = Store::query()->sole();
        $photoPath = "product-photos/{$store->public_id}/product.jpg";
        $variantPhotoPath = "product-variant-photos/{$store->public_id}/variant.jpg";
        Storage::disk('local')->put($photoPath, 'product');
        Storage::disk('local')->put($variantPhotoPath, 'variant');
        $product = Product::factory()->create([
            'store_id' => $store->id,
            'photo_path' => $photoPath,
        ]);
        DB::table('inventory_balances')->insert([
            'store_id' => $store->id,
            'product_id' => $product->id,
            'stock_key' => 'product:'.$product->id,
        ]);
        $otherProduct = Product::factory()->create();
        $this->actingAs($owner)->delete(route('stores.destroy', $store));

        $this->actingAs($owner)->delete(route('stores.force-destroy', $store), [
            'store_name' => 'Nama Salah',
            'confirmation' => '1',
        ])->assertSessionHasErrors('store_name');
        $this->assertDatabaseHas('stores', ['id' => $store->id]);

        $this->actingAs($owner)->delete(route('stores.force-destroy', $store), [
            'store_name' => 'Toko Tutup',
            'confirmation' => '1',
        ])->assertRedirect(route('stores.index'));

        $this->assertDatabaseMissing('stores', ['id' => $store->id]);
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertDatabaseMissing('inventory_balances', ['store_id' => $store->id]);
        $this->assertDatabaseHas('products', ['id' => $otherProduct->id]);
        $this->assertDatabaseHas('users', ['id' => $owner->id]);
        Storage::disk('local')->assertMissing($photoPath);
        Storage::disk('local')->assertMissing($variantPhotoPath);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $owner->id,
            'action' => 'store.deleted',
            'store_id' => null,
        ]);
    }
}
