<?php

namespace Tests\Feature;

use App\Actions\Platform\RecordAdminAudit;
use App\Actions\Subscriptions\PostSubscriptionPayment;
use App\Enums\FinancialAccountType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Category;
use App\Models\FinancialAccount;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionScanUsage;
use App\Models\Unit;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionEntitlements;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class SubscriptionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_store_receives_the_active_default_subscription(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)->post(route('stores.store'), ['name' => 'Toko Subscription'])->assertRedirect(route('dashboard'));

        $store = Store::query()->sole();
        $subscription = Subscription::query()->with('plan')->sole();
        $this->assertSame($store->id, $subscription->store_id);
        $this->assertSame($owner->id, $subscription->user_id);
        $this->assertSame(SubscriptionStatus::Active, $subscription->status);
        $this->assertNull($subscription->trial_ends_at);
        $this->assertNull($subscription->current_period_end);
        $this->assertTrue($subscription->plan->is_default);
        $this->assertDatabaseHas('audit_logs', ['store_id' => $store->id, 'action' => 'store.created']);
    }

    public function test_owned_stores_share_one_account_subscription_and_respect_the_store_limit(): void
    {
        $owner = User::factory()->create();
        Plan::query()->where('is_default', true)->update(['max_stores' => 2]);

        $this->actingAs($owner)->post(route('stores.store'), ['name' => 'Toko Pertama'])->assertRedirect(route('dashboard'));
        $this->actingAs($owner)->post(route('stores.store'), ['name' => 'Toko Kedua'])->assertRedirect(route('dashboard'));

        $stores = Store::query()->where('owner_user_id', $owner->id)->orderBy('id')->get();
        $this->assertCount(2, $stores);
        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertSame(
            $stores[0]->subscription()->sole()->id,
            $stores[1]->subscription()->sole()->id,
        );
        $this->actingAs($owner)->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('storeCreation.can_create', false)
                ->where('storeCreation.stores_used', 2)
                ->where('storeCreation.max_stores', 2));
        $this->actingAs($owner)->get(route('stores.create'))
            ->assertRedirect(route('stores.index'));

        $this->actingAs($owner)->post(route('stores.store'), ['name' => 'Toko Ketiga'])
            ->assertSessionHasErrors('name');
        $this->assertSame(2, Store::query()->where('owner_user_id', $owner->id)->count());
    }

    public function test_stores_index_exposes_the_current_owner_capacity_preview(): void
    {
        $this->travelTo('2026-09-08 10:00:00');
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $store->subscription()->sole()->plan()->update([
            'max_stores' => 2,
            'max_members' => 3,
            'max_scans' => 100,
        ]);
        SubscriptionScanUsage::create([
            'user_id' => $owner->id,
            'period_start' => '2026-09-01',
            'period_end' => '2026-09-30',
            'used' => 80,
        ]);

        $this->actingAs($owner)->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('usage.plan_name', 'Gratis Selamanya')
                ->where('usage.stores_used', 1)
                ->where('usage.max_stores', 2)
                ->where('usage.members_used', 0)
                ->where('usage.max_members', 3)
                ->where('usage.scans_used', 80)
                ->where('usage.max_scans', 100));
    }

    public function test_account_subscription_migration_rolls_back_without_leaving_owned_stores_uncovered(): void
    {
        $owner = User::factory()->create();
        Store::factory()->count(2)->for($owner, 'owner')->create();
        $this->assertDatabaseCount('subscriptions', 1);

        $periodMigration = require database_path('migrations/2026_08_24_130000_create_subscription_periods.php');
        $migration = require database_path('migrations/2026_08_22_120000_make_subscriptions_account_scoped.php');
        $periodMigration->down();
        $migration->down();

        $this->assertFalse(Schema::hasColumn('subscriptions', 'user_id'));
        $this->assertFalse(Schema::hasColumn('plans', 'max_stores'));
        $this->assertDatabaseCount('subscriptions', 2);

        $migration->up();
        $periodMigration->up();

        $this->assertTrue(Schema::hasColumn('subscriptions', 'user_id'));
        $this->assertTrue(Schema::hasColumn('plans', 'max_stores'));
        $this->assertSame(1, Subscription::query()->where('user_id', $owner->id)->count());
        $this->assertDatabaseCount('subscriptions', 2);
    }

    public function test_trial_metadata_migration_rolls_back_and_backfills_existing_trial_history(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $store->subscription()->update([
            'trial_ends_at' => '2026-08-20 10:00:00',
            'trial_used_at' => null,
        ]);

        $migration = require database_path('migrations/2026_08_24_000000_identify_trial_plans.php');
        $migration->down();
        $this->assertFalse(Schema::hasColumn('plans', 'is_trial'));
        $this->assertFalse(Schema::hasColumn('subscriptions', 'trial_used_at'));

        $migration->up();
        $this->assertTrue(Schema::hasColumn('plans', 'is_trial'));
        $this->assertTrue(Schema::hasColumn('subscriptions', 'trial_used_at'));
        $this->assertNotNull($store->subscription()->sole()->trial_used_at);
        $this->assertTrue(Plan::query()->where('code', 'starter-default')->sole()->is_trial);
    }

    public function test_plan_duration_migration_is_reversible_and_backfills_months_from_existing_names(): void
    {
        $plan = Plan::create([
            'code' => 'six-month-existing',
            'name' => 'Paket 6 Bulan',
            'monthly_price' => '100000',
            'duration_months' => 1,
            'is_active' => true,
            'is_default' => false,
        ]);
        $migration = require database_path('migrations/2026_08_24_120000_add_duration_months_to_plans.php');

        $migration->down();
        $this->assertFalse(Schema::hasColumn('plans', 'duration_months'));

        $migration->up();
        $this->assertTrue(Schema::hasColumn('plans', 'duration_months'));
        $this->assertSame(6, (int) DB::table('plans')->where('id', $plan->id)->value('duration_months'));
    }

    public function test_subscription_period_migration_is_reversible_and_backfills_existing_periods(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $subscription = $store->subscription()->sole();
        $subscription->update([
            'status' => SubscriptionStatus::Active,
            'current_period_start' => '2026-08-01',
            'current_period_end' => '2026-08-31',
        ]);
        $migration = require database_path('migrations/2026_08_24_130000_create_subscription_periods.php');

        $migration->down();
        $this->assertFalse(Schema::hasTable('subscription_periods'));

        $migration->up();
        $this->assertTrue(Schema::hasTable('subscription_periods'));
        $this->assertDatabaseHas('subscription_periods', [
            'subscription_id' => $subscription->id,
            'user_id' => $owner->id,
            'plan_id' => $subscription->plan_id,
            'period_start' => '2026-08-01',
            'period_end' => '2026-08-31',
            'source' => 'migration',
        ]);
    }

    public function test_flexible_entitlement_migration_is_reversible_and_restores_the_free_default(): void
    {
        $store = Store::factory()->create();
        $restrictedStore = Store::factory()->create();
        $restrictedStore->subscription()->sole()->update(['status' => SubscriptionStatus::Suspended]);
        $migration = require database_path('migrations/2026_09_09_000000_add_flexible_subscription_entitlements.php');

        $migration->down();
        $this->assertFalse(Schema::hasColumn('plans', 'kind'));
        $this->assertFalse(Schema::hasTable('subscription_addons'));
        $this->assertTrue(Plan::query()->where('code', 'starter-default')->sole()->is_trial);

        $migration->up();
        $free = Plan::query()->where('code', 'starter-default')->sole();
        $this->assertTrue(Schema::hasColumns('plans', ['kind', 'billing_cycle', 'max_scans']));
        $this->assertTrue(Schema::hasTable('subscription_addons'));
        $this->assertSame('Gratis Selamanya', $free->name);
        $this->assertFalse($free->is_trial);
        $this->assertSame(SubscriptionStatus::Active, $store->subscription()->sole()->status);
        $this->assertSame(SubscriptionStatus::Suspended, $restrictedStore->subscription()->sole()->status);
        $this->assertDatabaseHas('subscription_periods', [
            'subscription_id' => $store->subscription()->sole()->id,
            'plan_name' => 'Gratis Selamanya',
            'period_end' => null,
            'was_trial' => false,
        ]);
    }

    public function test_offer_category_migration_backfills_plans_and_addon_snapshots_reversibly(): void
    {
        $storeOffer = Plan::create([
            'code' => 'legacy-store-addon', 'name' => 'Legacy Store Add-on',
            'kind' => Plan::KIND_ADDON, 'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => 0, 'duration_months' => 1,
            'max_stores' => 1, 'max_products' => 0, 'max_members' => 0, 'max_scans' => 0,
            'is_active' => true, 'is_default' => false, 'is_trial' => false,
        ]);
        $mixedOffer = Plan::create([
            'code' => 'legacy-mixed-addon', 'name' => 'Legacy Mixed Add-on',
            'kind' => Plan::KIND_ADDON, 'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => 0, 'duration_months' => 1,
            'max_stores' => 1, 'max_products' => 0, 'max_members' => 1, 'max_scans' => 0,
            'is_active' => true, 'is_default' => false, 'is_trial' => false,
        ]);
        $migration = require database_path('migrations/2026_09_11_000000_add_offer_categories_to_subscription_addons.php');

        $migration->down();
        $this->assertFalse(Schema::hasColumn('plans', 'offer_category'));
        $this->assertFalse(Schema::hasColumn('subscription_addons', 'offer_category'));

        $migration->up();
        $this->assertSame(Plan::CATEGORY_STORE, DB::table('plans')->where('id', $storeOffer->id)->value('offer_category'));
        $this->assertSame(Plan::CATEGORY_GENERAL, DB::table('plans')->where('id', $mixedOffer->id)->value('offer_category'));
        $this->assertNull(DB::table('plans')->where('is_default', true)->value('offer_category'));
    }

    public function test_free_subscription_backfill_covers_existing_customers_and_retires_old_offers_safely(): void
    {
        $legacy = Plan::create([
            'code' => 'legacy-monthly', 'name' => 'Legacy Monthly', 'kind' => Plan::KIND_BASE,
            'billing_cycle' => Plan::BILLING_FIXED, 'monthly_price' => '100000', 'duration_months' => 1,
            'max_stores' => 2, 'max_products' => 100, 'max_members' => 2, 'max_scans' => 0,
            'is_default' => false, 'is_trial' => false, 'is_active' => true,
        ]);
        $unused = Plan::create([
            'code' => 'unused-monthly', 'name' => 'Unused Monthly', 'kind' => Plan::KIND_BASE,
            'billing_cycle' => Plan::BILLING_FIXED, 'monthly_price' => '200000', 'duration_months' => 1,
            'max_stores' => 3, 'max_products' => 500, 'max_members' => 5, 'max_scans' => 500,
            'is_default' => false, 'is_trial' => false, 'is_active' => true,
        ]);
        $customerWithoutStore = User::factory()->create();
        $existingFreeOwner = User::factory()->create();
        $existingFreeStore = Store::factory()->for($existingFreeOwner, 'owner')->create();
        $existingFreeSubscription = $existingFreeStore->subscription()->sole();
        $existingFreeSubscription->update(['current_period_start' => '2026-01-01']);
        $existingFreeSubscription->periods()->whereNull('period_end')->update(['period_start' => '2026-01-01']);
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $staff = User::factory()->create();
        $store->users()->attach($staff, [
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);
        $subscription = $store->subscription()->sole();
        $subscription->update(['plan_id' => $legacy->id, 'status' => SubscriptionStatus::Active]);
        DB::table('subscription_periods')->insert([
            'public_id' => (string) Str::ulid(), 'subscription_id' => $subscription->id,
            'user_id' => $owner->id, 'plan_id' => $legacy->id, 'plan_name' => $legacy->name,
            'monthly_price' => $legacy->monthly_price, 'duration_months' => 1, 'was_trial' => false,
            'period_start' => now()->subMonth()->toDateString(), 'period_end' => now()->subDay()->toDateString(),
            'source' => 'self_service', 'activated_at' => now()->subMonth(), 'created_by_user_id' => $owner->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $scheduledId = (string) Str::ulid();
        DB::table('subscription_periods')->insert([
            'public_id' => $scheduledId, 'subscription_id' => $subscription->id,
            'user_id' => $owner->id, 'plan_id' => $legacy->id, 'plan_name' => $legacy->name,
            'monthly_price' => $legacy->monthly_price, 'duration_months' => 1, 'was_trial' => false,
            'period_start' => now()->addMonth()->toDateString(), 'period_end' => now()->addMonths(2)->subDay()->toDateString(),
            'source' => 'self_service', 'activated_at' => null, 'created_by_user_id' => $owner->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $restrictedOwner = User::factory()->create();
        $restrictedStore = Store::factory()->for($restrictedOwner, 'owner')->create();
        $restrictedStore->subscription()->sole()->update([
            'plan_id' => $legacy->id,
            'status' => SubscriptionStatus::Suspended,
        ]);
        $admin = User::factory()->superAdmin()->create();
        $migration = require database_path('migrations/2026_09_10_000000_backfill_free_subscriptions_and_seed_addons.php');

        $migration->up();
        $migration->up();

        $free = Plan::query()->where('code', 'starter-default')->sole();
        $this->assertSame(1, $free->max_stores);
        $this->assertSame(1, $free->max_members);
        $this->assertSame(100, $free->max_scans);
        $this->assertSame($free->id, $customerWithoutStore->subscription()->sole()->plan_id);
        $this->assertSame(SubscriptionStatus::Active, $customerWithoutStore->subscription()->sole()->status);
        $this->assertSame('2026-01-01', $existingFreeSubscription->fresh()->current_period_start?->toDateString());
        $this->assertSame($free->id, $subscription->fresh()->plan_id);
        $this->assertSame($free->id, $restrictedStore->subscription()->sole()->plan_id);
        $this->assertSame(SubscriptionStatus::Suspended, $restrictedStore->subscription()->sole()->status);
        $this->assertFalse($admin->subscription()->exists());
        $this->assertFalse($staff->subscription()->exists());
        $this->assertDatabaseMissing('subscription_periods', ['public_id' => $scheduledId]);
        $this->assertFalse($legacy->fresh()->is_active);
        $this->assertDatabaseMissing('plans', ['id' => $unused->id]);
        $this->assertSame(3, Plan::query()->where('kind', Plan::KIND_ADDON)->count());
        $this->assertSame(0, Plan::query()->where('kind', Plan::KIND_ADDON)->where('is_active', true)->count());
    }

    public function test_public_pricing_page_only_lists_active_non_default_offers(): void
    {
        $this->withoutVite();
        Plan::create([
            'code' => 'public-growth', 'name' => 'Growth', 'monthly_price' => '250000',
            'max_products' => 500, 'max_members' => 10, 'is_active' => true, 'is_default' => false,
        ]);
        Plan::create([
            'code' => 'retired-public', 'name' => 'Retired', 'monthly_price' => '100000',
            'max_products' => 100, 'max_members' => 3, 'is_active' => false, 'is_default' => false,
        ]);

        $this->get(route('pricing'))->assertInertia(fn (Assert $page) => $page
            ->component('public/pricing')
            ->has('plans', 1)
            ->where('plans.0.name', 'Growth')
            ->where('plans.0.is_default', false)
            ->where('plans.0.is_current', false));

        $free = Plan::query()->where('is_default', true)->sole();
        $owner = User::factory()->create();
        Store::factory()->for($owner, 'owner')->create();
        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $free->public_id])
            ->assertSessionHasErrors('plan_id');
    }

    public function test_plan_seeder_is_idempotent_and_marks_the_free_forever_default(): void
    {
        $this->seed(PlanSeeder::class);
        $this->seed(PlanSeeder::class);

        $free = Plan::query()->where('is_default', true)->sole();
        $this->assertSame('starter-default', $free->code);
        $this->assertSame('Gratis Selamanya', $free->name);
        $this->assertTrue($free->is_default);
        $this->assertTrue($free->is_active);
        $this->assertFalse($free->is_trial);
        $this->assertSame(Plan::BILLING_LIFETIME, $free->billing_cycle);
        $this->assertSame(1, $free->max_members);
        $this->assertSame(100, $free->max_scans);
    }

    public function test_plan_code_is_generated_server_side_and_stays_internal(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $payload = [
            'name' => 'Paket Usaha', 'description' => null, 'monthly_price' => '150000',
            'duration_months' => 3, 'max_stores' => 2, 'max_products' => 500, 'max_members' => 5, 'is_active' => true,
        ];

        $this->actingAs($admin)->post(route('super-admin.plans.store'), $payload)
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->actingAs($admin)->post(route('super-admin.plans.store'), $payload)
            ->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseHas('plans', ['name' => 'Paket Usaha', 'code' => 'paket-usaha', 'duration_months' => 3]);
        $this->assertDatabaseHas('plans', ['name' => 'Paket Usaha', 'code' => 'paket-usaha-2']);
    }

    public function test_paid_plan_duration_must_be_between_one_and_twelve_months(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $payload = [
            'name' => 'Paket Durasi', 'description' => null, 'monthly_price' => '150000',
            'max_stores' => 2, 'max_products' => 500, 'max_members' => 5, 'is_active' => true,
        ];

        $this->actingAs($admin)->post(route('super-admin.plans.store'), [
            ...$payload,
            'duration_months' => 0,
        ])->assertSessionHasErrors('duration_months');
        $this->actingAs($admin)->post(route('super-admin.plans.store'), [
            ...$payload,
            'duration_months' => 13,
        ])->assertSessionHasErrors('duration_months');

        $this->assertDatabaseMissing('plans', ['name' => 'Paket Durasi']);
    }

    public function test_addon_offer_increases_account_entitlements_without_replacing_the_base_plan(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create(['name' => 'Toko Utama']);
        $subscription = $store->subscription()->with('plan')->sole();
        $basePlanId = $subscription->plan_id;
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->post(route('super-admin.plans.store'), [
            'name' => 'Tambah Kapasitas Dasar',
            'description' => null,
            'kind' => Plan::KIND_ADDON,
            'offer_category' => Plan::CATEGORY_GENERAL,
            'billing_cycle' => Plan::BILLING_LIFETIME,
            'monthly_price' => '0',
            'duration_months' => 1,
            'max_stores' => 1,
            'max_products' => 0,
            'max_members' => 1,
            'max_scans' => 50,
            'is_active' => true,
        ])->assertRedirect()->assertSessionHasNoErrors();
        $addon = Plan::query()->where('name', 'Tambah Kapasitas Dasar')->sole();

        $this->actingAs($owner)->get(route('pricing'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('plans.0.name', 'Tambah Kapasitas Dasar')
                ->where('plans.0.kind', Plan::KIND_ADDON)
                ->where('plans.0.can_select', true));
        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $addon->public_id])
            ->assertRedirect(route('subscription.index'))->assertSessionHasNoErrors();

        $this->assertSame($basePlanId, $subscription->fresh()?->plan_id);
        $this->assertDatabaseHas('subscription_addons', [
            'subscription_id' => $subscription->id,
            'user_id' => $owner->id,
            'plan_id' => $addon->id,
            'offer_category' => Plan::CATEGORY_GENERAL,
            'stores' => 1,
            'members' => 1,
            'scans' => 50,
            'ends_on' => null,
        ]);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('subscription.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('usage.max_stores', 2)
                ->where('usage.max_members', 2)
                ->where('usage.max_scans', 150)
                ->has('addons', 1));
        $this->actingAs($admin)->get(route('super-admin.subscriptions.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('subscriptions.data.0.active_addons', 1)
                ->where('subscriptions.data.0.active_addons.0.plan_name', 'Tambah Kapasitas Dasar')
                ->where('subscriptions.data.0.active_addons.0.scans', 50));

        $this->actingAs($owner)->post(route('stores.store'), ['name' => 'Toko Kedua'])
            ->assertRedirect(route('dashboard'))->assertSessionHasNoErrors();
        $this->actingAs($owner)->post(route('stores.store'), ['name' => 'Toko Ketiga'])
            ->assertSessionHasErrors('name');
    }

    public function test_addon_category_must_match_its_single_capacity_and_pricing_accepts_context(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $payload = [
            'name' => 'Tambah Staf', 'description' => null,
            'kind' => Plan::KIND_ADDON, 'offer_category' => Plan::CATEGORY_STORE,
            'billing_cycle' => Plan::BILLING_FIXED, 'monthly_price' => '50000',
            'duration_months' => 1, 'max_stores' => 0, 'max_products' => 0,
            'max_members' => 1, 'max_scans' => 0, 'is_active' => true,
        ];

        $this->actingAs($admin)->post(route('super-admin.plans.store'), $payload)
            ->assertSessionHasErrors('offer_category');
        $this->actingAs($admin)->post(route('super-admin.plans.store'), [
            ...$payload,
            'offer_category' => Plan::CATEGORY_STAFF,
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->get(route('pricing', ['category' => Plan::CATEGORY_STAFF]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('focus_category', Plan::CATEGORY_STAFF)
                ->where('plans.0.offer_category', Plan::CATEGORY_STAFF));
        $this->get(route('pricing', ['category' => 'unknown']))
            ->assertInertia(fn (Assert $page) => $page->where('focus_category', null));
    }

    public function test_paid_plan_can_replace_the_free_lifetime_plan_immediately(): void
    {
        $this->travelTo('2026-09-07 10:00:00');
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $subscription = $store->subscription()->sole();
        $paid = Plan::create([
            'code' => 'growth-from-free', 'name' => 'Growth', 'kind' => Plan::KIND_BASE,
            'billing_cycle' => Plan::BILLING_FIXED, 'monthly_price' => '250000', 'duration_months' => 1,
            'max_stores' => 3, 'max_products' => 1000, 'max_members' => 5, 'max_scans' => 1000,
            'is_active' => true, 'is_default' => false, 'is_trial' => false,
        ]);

        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $paid->public_id])
            ->assertRedirect(route('dashboard'))->assertSessionHasNoErrors();

        $subscription->refresh();
        $this->assertSame($paid->id, $subscription->plan_id);
        $this->assertSame('2026-09-07', $subscription->current_period_start?->format('Y-m-d'));
        $this->assertSame('2026-10-06', $subscription->current_period_end?->format('Y-m-d'));
    }

    public function test_expired_trial_is_disabled_on_pricing_while_paid_plan_can_be_selected(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $trial = Plan::create([
            'code' => 'legacy-trial', 'name' => 'Legacy Trial', 'monthly_price' => '0',
            'max_stores' => 1, 'max_products' => 100, 'max_members' => 1,
            'is_active' => true, 'is_default' => false, 'is_trial' => true,
        ]);
        $store->subscription()->update([
            'plan_id' => $trial->id,
            'status' => SubscriptionStatus::Trialing,
            'trial_ends_at' => now()->subDay(),
            'trial_used_at' => now()->subDays(31),
        ]);
        Plan::create([
            'code' => 'growth-selectable', 'name' => 'Growth', 'monthly_price' => '250000',
            'max_stores' => 3, 'max_products' => 1000, 'max_members' => 10,
            'is_active' => true, 'is_default' => false, 'is_trial' => false,
        ]);

        $this->actingAs($owner)->get(route('pricing'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/pricing')
                ->where('account.can_access_dashboard', false)
                ->where('account.trial_used', true)
                ->where('plans.0.is_trial', true)
                ->where('plans.0.can_select', false)
                ->where('plans.0.disabled_reason', 'The trial has already been used.')
                ->where('plans.1.name', 'Growth')
                ->where('plans.1.can_select', true));
    }

    public function test_owner_can_confirm_paid_plan_after_trial_expiry_and_dashboard_is_unlocked(): void
    {
        $this->travelTo('2026-08-24 10:00:00');
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $subscription = $store->subscription()->sole();
        $subscription->update([
            'status' => SubscriptionStatus::Trialing,
            'trial_ends_at' => now()->subDay(),
            'trial_used_at' => now()->subDays(31),
        ]);
        $paid = Plan::create([
            'code' => 'owner-growth', 'name' => 'Owner Growth', 'monthly_price' => '250000',
            'duration_months' => 3,
            'max_stores' => 3, 'max_products' => 1000, 'max_members' => 10,
            'is_active' => true, 'is_default' => false, 'is_trial' => false,
        ]);

        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $paid->public_id])
            ->assertRedirect(route('dashboard'))->assertSessionHasNoErrors();

        $subscription->refresh();
        $this->assertSame($paid->id, $subscription->plan_id);
        $this->assertSame(SubscriptionStatus::Active, $subscription->status);
        $this->assertSame('2026-08-24', $subscription->current_period_start?->format('Y-m-d'));
        $this->assertSame('2026-11-23', $subscription->current_period_end?->format('Y-m-d'));
        $this->assertNotNull($subscription->trial_used_at);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $owner->id,
            'action' => 'subscription.plan_selected',
            'subject_id' => $subscription->id,
        ]);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))->assertOk();

        $next = Plan::create([
            'code' => 'owner-next', 'name' => 'Owner Next', 'monthly_price' => '100000',
            'duration_months' => 1,
            'max_stores' => 3, 'max_products' => 1000, 'max_members' => 10,
            'is_active' => true, 'is_default' => false, 'is_trial' => false,
        ]);

        $this->actingAs($owner)->get(route('pricing'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('account.next_period_start', '2026-11-24')
                ->where('plans.0.can_select', true)
                ->where('plans.1.can_select', true));
        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $next->public_id])
            ->assertRedirect(route('subscription.index'))->assertSessionHasNoErrors();

        $subscription->refresh();
        $this->assertSame($paid->id, $subscription->plan_id);
        $this->assertSame('2026-11-23', $subscription->current_period_end?->format('Y-m-d'));
        $this->assertDatabaseHas('subscription_periods', [
            'subscription_id' => $subscription->id,
            'plan_id' => $paid->id,
            'period_start' => '2026-08-24',
            'period_end' => '2026-11-23',
        ]);
        $this->assertDatabaseHas('subscription_periods', [
            'subscription_id' => $subscription->id,
            'plan_id' => $next->id,
            'period_start' => '2026-11-24',
            'period_end' => '2026-12-23',
            'activated_at' => null,
        ]);
        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $paid->public_id])
            ->assertRedirect(route('subscription.index'))->assertSessionHasNoErrors();
        $this->assertDatabaseHas('subscription_periods', [
            'subscription_id' => $subscription->id,
            'plan_id' => $paid->id,
            'period_start' => '2026-12-24',
            'period_end' => '2027-03-23',
            'activated_at' => null,
        ]);
        $this->actingAs($owner)->get(route('pricing'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('account.next_period_start', '2027-03-24'));
        $admin = User::factory()->superAdmin()->create();
        $this->actingAs($admin)->get(route('super-admin.subscriptions.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('subscriptions.data', 1)
                ->where('subscriptions.data.0.plan.name', 'Owner Growth')
                ->has('subscriptions.data.0.scheduled_periods', 2)
                ->where('subscriptions.data.0.scheduled_periods.0.plan_name', 'Owner Next')
                ->where('subscriptions.data.0.scheduled_periods.0.period_start', '2026-11-24')
                ->where('subscriptions.data.0.scheduled_periods.0.period_end', '2026-12-23')
                ->where('subscriptions.data.0.scheduled_periods.1.plan_name', 'Owner Growth')
                ->where('subscriptions.data.0.scheduled_periods.1.period_start', '2026-12-24')
                ->where('subscriptions.data.0.scheduled_periods.1.period_end', '2027-03-23'));
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('subscription.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('history.data', 4)
                ->where('history.data.0.plan_name', 'Owner Growth')
                ->where('history.data.0.status', 'scheduled')
                ->where('history.data.1.plan_name', 'Owner Next')
                ->where('history.data.1.status', 'scheduled')
                ->where('history.data.2.plan_name', 'Owner Growth')
                ->where('history.data.2.status', 'active')
                ->where('history.data.3.plan_name', 'Gratis Selamanya')
                ->where('history.data.3.is_trial', false)
                ->where('history.data.3.status', 'completed'));

        $this->travelTo('2026-11-24 09:00:00');
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))->assertOk();
        $subscription->refresh();
        $this->assertSame($next->id, $subscription->plan_id);
        $this->assertSame('2026-11-24', $subscription->current_period_start?->format('Y-m-d'));
        $this->assertSame('2026-12-23', $subscription->current_period_end?->format('Y-m-d'));
        $this->assertDatabaseMissing('subscription_periods', [
            'subscription_id' => $subscription->id,
            'plan_id' => $next->id,
            'activated_at' => null,
        ]);
    }

    public function test_trial_cannot_be_selected_twice_or_by_a_non_owner(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $subscription = $store->subscription()->sole();
        $subscription->update([
            'status' => SubscriptionStatus::PastDue,
            'trial_ends_at' => now()->subDay(),
            'trial_used_at' => now()->subDays(31),
        ]);
        $trial = Plan::create([
            'code' => 'one-time-trial', 'name' => 'Trial 30 Hari', 'monthly_price' => '0',
            'max_stores' => 1, 'max_products' => 100, 'max_members' => 1,
            'is_active' => true, 'is_default' => false, 'is_trial' => true,
        ]);

        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $trial->public_id])
            ->assertSessionHasErrors('plan_id');
        $this->assertSame(SubscriptionStatus::PastDue, $subscription->fresh()?->status);

        $nonOwner = User::factory()->create();
        $this->actingAs($nonOwner)->post(route('pricing.subscribe'), ['plan_id' => $trial->public_id])
            ->assertForbidden();
    }

    public function test_selected_plan_must_cover_current_account_usage(): void
    {
        $owner = User::factory()->create();
        $firstStore = Store::factory()->for($owner, 'owner')->create();
        Store::factory()->for($owner, 'owner')->create();
        $firstStore->subscription()->update(['status' => SubscriptionStatus::PastDue]);
        $small = Plan::create([
            'code' => 'one-store', 'name' => 'One Store', 'monthly_price' => '100000',
            'max_stores' => 1, 'max_products' => 100, 'max_members' => 5,
            'is_active' => true, 'is_default' => false, 'is_trial' => false,
        ]);

        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $small->public_id])
            ->assertSessionHasErrors('plan_id');
        $this->assertSame(SubscriptionStatus::PastDue, $firstStore->subscription()->sole()->status);
    }

    public function test_owner_does_not_consume_a_staff_seat_when_selecting_a_plan(): void
    {
        $owner = User::factory()->create();
        $staff = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $store->users()->attach($staff->id, [
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);
        $subscription = $store->subscription()->sole();
        $subscription->update(['status' => SubscriptionStatus::PastDue]);
        $oneStaffPlan = Plan::create([
            'code' => 'one-staff', 'name' => 'One Staff', 'monthly_price' => '100000',
            'max_stores' => 1, 'max_products' => 100, 'max_members' => 1,
            'is_active' => true, 'is_default' => false, 'is_trial' => false,
        ]);

        $this->actingAs($owner)->post(route('pricing.subscribe'), ['plan_id' => $oneStaffPlan->public_id])
            ->assertRedirect(route('dashboard'))->assertSessionHasNoErrors();

        $this->assertSame($oneStaffPlan->id, $subscription->fresh()?->plan_id);
        $this->assertSame(SubscriptionStatus::Active, $subscription->fresh()?->status);
    }

    public function test_super_admin_can_activate_all_subscriptions_from_today(): void
    {
        $this->travelTo('2026-08-22 10:00:00');
        $admin = User::factory()->superAdmin()->create();
        $freeStore = Store::factory()->create();
        $paidStore = Store::factory()->create();
        $paidPlan = Plan::create([
            'code' => 'monthly', 'name' => 'Monthly', 'monthly_price' => '200000',
            'duration_months' => 6,
            'max_products' => 0, 'max_members' => 0, 'is_active' => true, 'is_default' => false,
        ]);
        $freeStore->subscription()->update(['status' => SubscriptionStatus::Suspended, 'cancelled_at' => now()->subDay()]);
        $paidStore->subscription()->update([
            'plan_id' => $paidPlan->id,
            'status' => SubscriptionStatus::PastDue,
            'current_period_end' => now()->subDay(),
        ]);

        $this->actingAs($admin)->post(route('super-admin.subscriptions.activate-all'))->assertRedirect();

        $freeSubscription = $freeStore->subscription()->sole();
        $paidSubscription = $paidStore->subscription()->sole();
        $this->assertSame(SubscriptionStatus::Active, $freeSubscription->status);
        $this->assertSame('2026-08-22', $freeSubscription->starts_at->format('Y-m-d'));
        $this->assertNull($freeSubscription->trial_ends_at);
        $this->assertNull($freeSubscription->current_period_end);
        $this->assertNull($freeSubscription->cancelled_at);
        $this->assertSame(SubscriptionStatus::Active, $paidSubscription->status);
        $this->assertSame('2026-08-22', $paidSubscription->current_period_start?->format('Y-m-d'));
        $this->assertSame('2027-02-21', $paidSubscription->current_period_end?->format('Y-m-d'));
        $this->assertDatabaseCount('admin_audit_logs', 2);
    }

    public function test_platform_admin_can_create_plan_and_change_subscription_with_audit(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $store = Store::factory()->create();

        $this->actingAs($admin)->post(route('super-admin.plans.store'), [
            'code' => 'growth', 'name' => 'Growth', 'description' => 'Paket bertumbuh', 'monthly_price' => '250000',
            'duration_months' => 3, 'max_stores' => 5, 'max_products' => 500, 'max_members' => 10, 'is_default' => false, 'is_active' => true,
        ])->assertRedirect();
        $plan = Plan::query()->where('code', 'growth')->sole();
        $subscription = $store->subscription()->sole();
        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $subscription), [
            'plan_id' => $plan->public_id, 'status' => SubscriptionStatus::Active->value,
            'starts_at' => '2026-08-08', 'trial_ends_at' => '2026-08-31',
            'current_period_start' => '2026-08-08', 'current_period_end' => '2026-09-07', 'notes' => 'Growth aktif',
        ])->assertRedirect();

        $subscription->refresh();
        $this->assertSame($plan->id, $subscription->plan_id);
        $this->assertSame(SubscriptionStatus::Active, $subscription->status);
        $this->assertNull($subscription->trial_ends_at);
        $this->assertDatabaseHas('admin_audit_logs', ['user_id' => $admin->id, 'action' => 'plan.created', 'subject_id' => $plan->id]);
        $this->assertDatabaseHas('admin_audit_logs', ['user_id' => $admin->id, 'action' => 'subscription.updated', 'subject_id' => $subscription->id]);
    }

    public function test_platform_admin_can_manage_multiple_assigned_addons_atomically(): void
    {
        $this->travelTo('2026-09-08 10:00:00');
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $subscription = $store->subscription()->sole();
        $storeAddon = Plan::create([
            'code' => 'admin-store-addon', 'name' => 'Tambah Toko', 'kind' => Plan::KIND_ADDON,
            'offer_category' => Plan::CATEGORY_STORE, 'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => '50000', 'duration_months' => 2, 'max_stores' => 1,
            'max_products' => 0, 'max_members' => 0, 'max_scans' => 0, 'is_active' => true, 'is_default' => false,
        ]);
        $scanAddon = Plan::create([
            'code' => 'admin-scan-addon', 'name' => 'Tambah Scan', 'kind' => Plan::KIND_ADDON,
            'offer_category' => Plan::CATEGORY_SCAN, 'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => '25000', 'duration_months' => 1, 'max_stores' => 0,
            'max_products' => 0, 'max_members' => 0, 'max_scans' => 250, 'is_active' => true, 'is_default' => false,
        ]);

        $payload = [
            'plan_id' => $subscription->plan->public_id,
            'status' => SubscriptionStatus::Active->value,
            'starts_at' => '2026-09-01',
            'trial_ends_at' => null,
            'current_period_start' => '2026-09-01',
            'current_period_end' => null,
            'notes' => 'Dikelola admin',
            'addons' => [
                ['public_id' => null, 'plan_id' => $storeAddon->public_id, 'starts_on' => '2026-10-08', 'ends_on' => '2026-12-07'],
                ['public_id' => null, 'plan_id' => $scanAddon->public_id, 'starts_on' => '2026-09-08', 'ends_on' => '2026-10-07'],
                ['public_id' => null, 'plan_id' => $storeAddon->public_id, 'starts_on' => '2026-09-08', 'ends_on' => '2026-11-07'],
            ],
        ];
        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $subscription), $payload)
            ->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseCount('subscription_addons', 3);
        $this->assertDatabaseHas('subscription_addons', [
            'subscription_id' => $subscription->id, 'plan_id' => $storeAddon->id, 'stores' => 1, 'source' => 'admin',
        ]);
        $this->assertDatabaseHas('subscription_addons', [
            'subscription_id' => $subscription->id, 'plan_id' => $scanAddon->id, 'scans' => 250, 'source' => 'admin',
        ]);
        $limits = app(SubscriptionEntitlements::class)->forOwner($owner->id);
        $this->assertSame(2, $limits['max_stores']);
        $this->assertSame(350, $limits['max_scans']);

        $this->actingAs($admin)->get(route('super-admin.subscriptions.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('subscriptions.data.0.assigned_addons', 3)
                ->has('subscriptions.data.0.active_addons', 2)
                ->has('subscriptions.data.0.scheduled_addons', 1)
                ->where('subscriptions.data.0.scheduled_addons.0.starts_on', '2026-10-08')
                ->where('subscriptions.data.0.plan.max_stores', 1));

        $assigned = $subscription->addons()->orderBy('id')->get();
        $payload['addons'] = [[
            'public_id' => $assigned[1]->public_id,
            'plan_id' => $scanAddon->public_id,
            'starts_on' => '2026-09-10',
            'ends_on' => '2026-10-09',
        ]];
        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $subscription), $payload)
            ->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseCount('subscription_addons', 1);
        $this->assertDatabaseHas('subscription_addons', [
            'public_id' => $assigned[1]->public_id, 'starts_on' => '2026-09-10', 'ends_on' => '2026-10-09',
        ]);
        $this->assertDatabaseMissing('subscription_addons', ['public_id' => $assigned[0]->public_id]);
        $this->actingAs($admin)->get(route('super-admin.subscriptions.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('subscriptions.data.0.assigned_addons', 1)
                ->where('subscriptions.data.0.assigned_addons.0.plan_id', $scanAddon->public_id));
    }

    public function test_platform_admin_addon_management_rejects_invalid_relationships_and_dates(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $firstSubscription = Store::factory()->create()->subscription()->sole();
        $secondSubscription = Store::factory()->create()->subscription()->sole();
        $addonPlan = Plan::create([
            'code' => 'validated-addon', 'name' => 'Validated Add-on', 'kind' => Plan::KIND_ADDON,
            'offer_category' => Plan::CATEGORY_STAFF, 'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => 0, 'duration_months' => 1, 'max_stores' => 0,
            'max_products' => 0, 'max_members' => 1, 'max_scans' => 0, 'is_active' => true, 'is_default' => false,
        ]);
        $foreignAddon = $secondSubscription->addons()->create([
            'user_id' => $secondSubscription->user_id, 'plan_id' => $addonPlan->id, 'plan_name' => $addonPlan->name,
            'offer_category' => $addonPlan->offer_category, 'price' => 0, 'duration_months' => 1,
            'stores' => 0, 'products' => 0, 'members' => 1, 'scans' => 0,
            'starts_on' => now()->toDateString(), 'ends_on' => null, 'source' => 'admin', 'created_by_user_id' => $admin->id,
        ]);
        $basePayload = [
            'plan_id' => $firstSubscription->plan->public_id,
            'status' => SubscriptionStatus::Active->value,
            'starts_at' => now()->toDateString(),
            'trial_ends_at' => null,
            'current_period_start' => now()->toDateString(),
            'current_period_end' => null,
            'notes' => null,
        ];

        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $firstSubscription), [
            ...$basePayload,
            'addons' => [[
                'public_id' => $foreignAddon->public_id,
                'plan_id' => $addonPlan->public_id,
                'starts_on' => '2026-09-08',
                'ends_on' => '2026-09-07',
            ]],
        ])->assertSessionHasErrors(['addons.0.public_id', 'addons.0.ends_on']);

        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $firstSubscription), [
            ...$basePayload,
            'addons' => [[
                'public_id' => null,
                'plan_id' => $firstSubscription->plan->public_id,
                'starts_on' => '2026-09-08',
                'ends_on' => null,
            ]],
        ])->assertSessionHasErrors('addons.0.plan_id');
        $this->assertDatabaseCount('subscription_addons', 1);
    }

    public function test_subscription_payment_is_idempotent_immutable_and_renews_subscription(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $store = Store::factory()->create();
        $subscription = $store->subscription()->sole();
        $subscription->update(['status' => SubscriptionStatus::PastDue]);
        $action = app(PostSubscriptionPayment::class);
        $key = (string) Str::uuid();
        $first = $action->handle($admin, $subscription, '150000', '2026-08-01', '2026-08-31', 'bank_transfer', 'BANK-001', '2026-08-08T10:00:00+07:00', null, $key, '127.0.0.1');
        $second = $action->handle($admin, $subscription, '150000', '2026-08-01', '2026-08-31', 'bank_transfer', 'BANK-001', '2026-08-08T10:00:00+07:00', null, $key, '127.0.0.1');

        $this->assertTrue($first->is($second));
        $this->assertStringStartsWith('SUBPAY-202608-', $first->receipt_number);
        $this->assertDatabaseCount('subscription_payments', 1);
        $this->assertSame(SubscriptionStatus::Active, $subscription->fresh()?->status);
        $this->assertSame('2026-08-31', $subscription->fresh()?->current_period_end?->format('Y-m-d'));
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'subscription.payment_posted', 'subject_id' => $first->id]);
        try {
            $first->delete();
            $this->fail('Posted subscription payment must be immutable.');
        } catch (LogicException) {
            $this->assertDatabaseCount('subscription_payments', 1);
        }

        $this->expectException(ValidationException::class);
        $action->handle($admin, $subscription, '150001', '2026-08-01', '2026-08-31', 'bank_transfer', 'BANK-001', '2026-08-08T10:00:00+07:00', null, $key, '127.0.0.1');
    }

    public function test_platform_admin_can_update_notes_without_replacing_an_inactive_current_plan(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $store = Store::factory()->create();
        $subscription = $store->subscription()->sole();
        $subscription->plan()->update(['is_active' => false]);

        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $subscription), [
            'plan_id' => $subscription->plan->public_id,
            'status' => $subscription->status->value,
            'starts_at' => $subscription->starts_at->format('Y-m-d'),
            'trial_ends_at' => $subscription->trial_ends_at?->format('Y-m-d'),
            'current_period_start' => $subscription->current_period_start?->format('Y-m-d'),
            'current_period_end' => $subscription->current_period_end?->format('Y-m-d'),
            'notes' => 'Paket lama tetap dipertahankan.',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('Paket lama tetap dipertahankan.', $subscription->fresh()?->notes);

        $otherInactivePlan = Plan::create([
            'code' => 'retired', 'name' => 'Retired', 'monthly_price' => 0,
            'max_products' => 0, 'max_members' => 0, 'is_active' => false, 'is_default' => false,
        ]);
        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $subscription), [
            'plan_id' => $otherInactivePlan->public_id,
            'status' => $subscription->status->value,
            'starts_at' => $subscription->starts_at->format('Y-m-d'),
            'trial_ends_at' => null,
            'current_period_start' => null,
            'current_period_end' => null,
            'notes' => null,
        ])->assertSessionHasErrors('plan_id');

        $this->assertNotSame($otherInactivePlan->id, $subscription->fresh()?->plan_id);
    }

    public function test_payment_audit_failure_rolls_back_payment_sequence_and_renewal(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $subscription = Store::factory()->create()->subscription()->sole();
        $subscription->update(['status' => SubscriptionStatus::PastDue]);
        $this->mock(RecordAdminAudit::class)->shouldReceive('handle')->andThrow(new RuntimeException('Injected platform audit failure'));

        try {
            app(PostSubscriptionPayment::class)->handle($admin, $subscription, '100', '2026-08-01', '2026-08-31', 'cash', null, '2026-08-08T10:00:00Z', null, (string) Str::uuid(), null);
            $this->fail('Audit failure should roll back platform payment.');
        } catch (RuntimeException) {
            $this->assertDatabaseCount('subscription_payments', 0);
            $this->assertDatabaseCount('platform_sequences', 0);
            $this->assertSame(SubscriptionStatus::PastDue, $subscription->fresh()?->status);
        }
    }

    public function test_historical_payment_does_not_shorten_an_active_subscription(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $subscription = Store::factory()->create()->subscription()->sole();
        $subscription->update([
            'status' => SubscriptionStatus::Active,
            'current_period_start' => '2026-09-01',
            'current_period_end' => '2026-09-30',
        ]);

        app(PostSubscriptionPayment::class)->handle($admin, $subscription, '100', '2026-08-01', '2026-08-31', 'cash', null, '2026-08-08T10:00:00Z', 'Pembayaran historis', (string) Str::uuid(), null);

        $subscription->refresh();
        $this->assertSame(SubscriptionStatus::Active, $subscription->status);
        $this->assertSame('2026-09-01', $subscription->current_period_start?->format('Y-m-d'));
        $this->assertSame('2026-09-30', $subscription->current_period_end?->format('Y-m-d'));
        $this->assertDatabaseCount('subscription_payments', 1);

        $unlimitedSubscription = Store::factory()->create()->subscription()->sole();
        $unlimitedSubscription->update([
            'status' => SubscriptionStatus::Active,
            'current_period_start' => '2026-08-01',
            'current_period_end' => null,
        ]);
        $this->assertNull($unlimitedSubscription->current_period_end);
        app(PostSubscriptionPayment::class)->handle($admin, $unlimitedSubscription, '100', '2026-08-01', '2026-08-31', 'cash', null, '2026-08-08T10:00:00Z', null, (string) Str::uuid(), null);
        $this->assertNull($unlimitedSubscription->fresh()?->current_period_end);
    }

    public function test_payment_does_not_override_suspended_or_cancelled_status(): void
    {
        $admin = User::factory()->superAdmin()->create();

        foreach ([SubscriptionStatus::Suspended, SubscriptionStatus::Cancelled] as $status) {
            $subscription = Store::factory()->create()->subscription()->sole();
            $subscription->update([
                'status' => $status,
                'current_period_start' => '2026-08-01',
                'current_period_end' => '2026-08-31',
                'cancelled_at' => $status === SubscriptionStatus::Cancelled ? now() : null,
            ]);

            app(PostSubscriptionPayment::class)->handle($admin, $subscription, '100', '2026-09-01', '2026-09-30', 'cash', null, '2026-09-01T10:00:00Z', null, (string) Str::uuid(), null);

            $subscription->refresh();
            $this->assertSame($status, $subscription->status);
            $this->assertSame('2026-08-31', $subscription->current_period_end?->format('Y-m-d'));
        }

        $this->assertDatabaseCount('subscription_payments', 2);
    }

    public function test_non_operational_or_expired_subscription_is_blocked_from_portal_but_remains_visible(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $account = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Cash]);
        $store->subscription()->update(['status' => SubscriptionStatus::PastDue]);
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('dashboard'))->assertRedirect(route('subscription.index'));
        $this->actingAs($owner)->withSession($session)->get(route('subscription.index'))
            ->assertInertia(fn (Assert $page) => $page->component('customer/subscription/index')->where('usage.can_write', false)->where('usage.status', SubscriptionStatus::PastDue->value));
        $this->actingAs($owner)->withSession($session)->post(route('operations.cash.opening.store'), [
            'account_id' => $account->public_id, 'amount' => '100', 'occurred_at' => '2026-08-08T10:00', 'idempotency_key' => (string) Str::uuid(),
        ])->assertSessionHasErrors('subscription');
        $this->actingAs($owner)->patch(route('stores.update', $store), ['name' => 'Nama Baru'])->assertSessionHasErrors('subscription');
        $this->assertDatabaseCount('cash_transactions', 0);

        $store->subscription()->update(['status' => SubscriptionStatus::Active, 'current_period_end' => now()->subDay()]);
        $this->actingAs($owner)->withSession($session)->post(route('operations.cash.opening.store'), [
            'account_id' => $account->public_id, 'amount' => '100', 'occurred_at' => '2026-08-08T10:00', 'idempotency_key' => (string) Str::uuid(),
        ])->assertSessionHasErrors('subscription');
    }

    public function test_account_with_expired_trial_and_no_active_period_cannot_enter_store_portal(): void
    {
        $this->travelTo('2026-08-22 10:00:00');
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $store->subscription()->update([
            'status' => SubscriptionStatus::Active,
            'starts_at' => '2026-08-20',
            'trial_ends_at' => '2026-08-21',
            'current_period_start' => null,
            'current_period_end' => null,
        ]);
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('dashboard'))
            ->assertRedirect(route('subscription.index'));
        $this->actingAs($owner)->withSession($session)->get(route('subscription.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/subscription/index')
                ->where('usage.can_write', false)
                ->where('usage.reason', 'The subscription period has not been set.'));

        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $store->subscription()->sole()), [
            'plan_id' => $store->subscription()->sole()->plan->public_id,
            'status' => SubscriptionStatus::Active->value,
            'starts_at' => '2026-08-20',
            'trial_ends_at' => '2026-08-21',
            'current_period_start' => null,
            'current_period_end' => null,
            'notes' => null,
        ])->assertSessionHasErrors('current_period_start');
    }

    public function test_plan_limits_aggregate_active_products_and_distinct_members_across_owned_stores(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $firstStore = Store::factory()->for($owner, 'owner')->create();
        $secondStore = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($firstStore)->create();
        $plan = Plan::create(['code' => 'limited', 'name' => 'Limited', 'monthly_price' => 0, 'max_stores' => 2, 'max_products' => 1, 'max_members' => 1, 'is_active' => true, 'is_default' => false]);
        $firstStore->subscription()->update(['plan_id' => $plan->id]);
        $category = Category::factory()->for($secondStore)->create();
        $unit = Unit::factory()->for($secondStore)->create();
        $session = ['active_store_id' => $secondStore->id];

        $this->actingAs($owner)->withSession($session)->post(route('master-data.products.store'), [
            'idempotency_key' => (string) Str::uuid(), 'name' => 'Produk Kedua', 'sku' => 'LIMIT-2', 'barcode' => null,
            'description' => null, 'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $unit->public_id, 'large_unit_public_id' => $unit->public_id, 'variant_mode' => 'none',
            'purchase_price' => '10', 'selling_price' => '20', 'current_stock' => '0', 'minimum_stock' => '0',
            'variants' => [], 'is_active' => true,
        ])->assertSessionHasErrors('name');
        $this->actingAs($owner)->post(route('stores.members.store', $secondStore), ['email' => $member->email, 'role' => MembershipRole::Cashier->value])
            ->assertSessionHasNoErrors();
        $this->actingAs($owner)->post(route('stores.members.store', $secondStore), [
            'mode' => 'create', 'name' => 'Kasir Melebihi Batas', 'email' => 'limit.member@example.com',
            'password' => 'Password123!', 'password_confirmation' => 'Password123!', 'role' => MembershipRole::Cashier->value,
        ])->assertSessionHasErrors('email');
        $ownedStoreIds = Store::query()->where('owner_user_id', $owner->id)->pluck('id');
        $this->assertSame(1, Product::query()->whereIn('store_id', $ownedStoreIds)->count());
        $this->assertDatabaseHas('store_memberships', ['store_id' => $secondStore->id, 'user_id' => $member->id, 'status' => MembershipStatus::Active->value]);
        $this->assertDatabaseMissing('users', ['email' => 'limit.member@example.com']);
        $this->assertSame($product->id, Product::query()->sole()->id);
    }

    public function test_commercial_surfaces_are_guarded_and_platform_metrics_reconcile(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $plan = Plan::create(['code' => 'paid', 'name' => 'Paid', 'monthly_price' => '200000', 'max_products' => 0, 'max_members' => 0, 'is_active' => true, 'is_default' => false]);
        $subscription = $store->subscription()->sole();
        $subscription->update(['plan_id' => $plan->id, 'status' => SubscriptionStatus::Active]);
        app(PostSubscriptionPayment::class)->handle($admin, $subscription, '200000', now()->startOfMonth()->format('Y-m-d'), now()->endOfMonth()->format('Y-m-d'), 'qris', null, now()->toISOString(), null, (string) Str::uuid(), null);
        $expiredStore = Store::factory()->create();
        $expiredStore->subscription()->update([
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'current_period_end' => now()->subDay(),
        ]);

        $this->actingAs($owner)->get(route('super-admin.subscriptions.index'))->assertForbidden();
        $this->actingAs($admin)->get(route('super-admin.subscriptions.index'))
            ->assertInertia(fn (Assert $page) => $page->component('platform/subscriptions/index')
                ->has('plans', 5)
                ->has('subscriptions.data', 2)
                ->where('subscriptions.data.0.plan.monthly_price', '200000.0000')
                ->where('subscriptions.data.0.plan.is_active', true));
        $this->actingAs($admin)->get(route('super-admin.payments.index'))
            ->assertInertia(fn (Assert $page) => $page->component('platform/payments/index')->has('payments.data', 1)->where('summary.transactions', 1)->where('summary.amount', 200000));
        $this->actingAs($admin)->get(route('super-admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('metrics.operational_subscriptions', 1)->where('metrics.monthly_recurring_revenue', 200000)->where('metrics.payments_this_month', 200000));
        $this->actingAs($admin)->get(route('super-admin.stores.index'))
            ->assertInertia(fn (Assert $page) => $page->where('stores.data.0.subscription.status', SubscriptionStatus::Active->value)->where('stores.data.0.subscription.plan_name', 'Paid'));
    }
}
