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
use App\Models\Unit;
use App\Models\User;
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
        $this->assertSame(SubscriptionStatus::Trialing, $subscription->status);
        $this->assertSame(now()->addDays(30)->toDateString(), $subscription->trial_ends_at?->toDateString());
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

    public function test_public_pricing_page_only_lists_active_plans(): void
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
            ->component('pricing')
            ->has('plans', 2)
            ->where('plans.1.name', 'Growth')
            ->where('plans.0.max_stores', 3)
            ->where('plans.0.duration_months', 1)
            ->where('plans.0.is_current', false)
            ->where('plans.1.is_current', false));
    }

    public function test_trial_plan_seeder_is_idempotent_and_marks_the_canonical_trial(): void
    {
        $this->seed(PlanSeeder::class);
        $this->seed(PlanSeeder::class);

        $trial = Plan::query()->where('is_trial', true)->sole();
        $this->assertSame('starter-default', $trial->code);
        $this->assertSame('Trial 30 Hari', $trial->name);
        $this->assertTrue($trial->is_default);
        $this->assertTrue($trial->is_active);
        $this->assertSame(2, $trial->max_members);
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

    public function test_expired_trial_is_disabled_on_pricing_while_paid_plan_can_be_selected(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $store->subscription()->update([
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
                ->component('pricing')
                ->where('account.can_access_dashboard', false)
                ->where('account.trial_used', true)
                ->where('plans.0.is_trial', true)
                ->where('plans.0.can_select', false)
                ->where('plans.0.disabled_reason', 'Trial sudah digunakan.')
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
                ->where('plans.1.can_select', true)
                ->where('plans.2.can_select', true));
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
                ->where('history.data.3.plan_name', 'Trial 30 Hari')
                ->where('history.data.3.is_trial', true)
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
        $trial = Plan::query()->where('is_trial', true)->sole();

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
        $this->assertSame(SubscriptionStatus::Trialing, $freeSubscription->status);
        $this->assertSame('2026-08-22', $freeSubscription->starts_at->format('Y-m-d'));
        $this->assertSame('2026-09-21', $freeSubscription->trial_ends_at?->format('Y-m-d'));
        $this->assertNotNull($freeSubscription->trial_used_at);
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
            ->assertInertia(fn (Assert $page) => $page->component('subscription/index')->where('usage.can_write', false)->where('usage.status', SubscriptionStatus::PastDue->value));
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
                ->component('subscription/index')
                ->where('usage.can_write', false)
                ->where('usage.reason', 'Periode subscription belum ditetapkan.'));

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
        $this->assertDatabaseHas('store_user', ['store_id' => $secondStore->id, 'user_id' => $member->id, 'status' => MembershipStatus::Active->value]);
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
            ->assertInertia(fn (Assert $page) => $page->component('super-admin/subscriptions/index')
                ->has('plans', 2)
                ->has('subscriptions.data', 2)
                ->where('subscriptions.data.0.plan.monthly_price', '200000.0000')
                ->where('subscriptions.data.0.plan.is_active', true));
        $this->actingAs($admin)->get(route('super-admin.payments.index'))
            ->assertInertia(fn (Assert $page) => $page->component('super-admin/payments/index')->has('payments.data', 1)->where('summary.transactions', 1)->where('summary.amount', 200000));
        $this->actingAs($admin)->get(route('super-admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('metrics.operational_subscriptions', 1)->where('metrics.monthly_recurring_revenue', 200000)->where('metrics.payments_this_month', 200000));
        $this->actingAs($admin)->get(route('super-admin.stores.index'))
            ->assertInertia(fn (Assert $page) => $page->where('stores.data.0.subscription.status', SubscriptionStatus::Active->value)->where('stores.data.0.subscription.plan_name', 'Paid'));
    }
}
