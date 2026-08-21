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
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $this->assertSame(SubscriptionStatus::Active, $subscription->status);
        $this->assertTrue($subscription->plan->is_default);
        $this->assertDatabaseHas('audit_logs', ['store_id' => $store->id, 'action' => 'store.created']);
    }

    public function test_platform_admin_can_create_plan_and_change_subscription_with_audit(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $store = Store::factory()->create();

        $this->actingAs($admin)->post(route('super-admin.plans.store'), [
            'code' => 'growth', 'name' => 'Growth', 'description' => 'Paket bertumbuh', 'monthly_price' => '250000',
            'max_products' => 500, 'max_members' => 10, 'is_default' => false, 'is_active' => true,
        ])->assertRedirect();
        $plan = Plan::query()->where('code', 'growth')->sole();
        $subscription = $store->subscription()->sole();
        $this->actingAs($admin)->patch(route('super-admin.subscriptions.update', $subscription), [
            'plan_id' => $plan->public_id, 'status' => SubscriptionStatus::Trialing->value,
            'starts_at' => '2026-08-08', 'trial_ends_at' => '2026-08-22',
            'current_period_start' => null, 'current_period_end' => null, 'notes' => 'Trial Growth',
        ])->assertRedirect();

        $subscription->refresh();
        $this->assertSame($plan->id, $subscription->plan_id);
        $this->assertSame(SubscriptionStatus::Trialing, $subscription->status);
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

    public function test_non_operational_or_expired_subscription_is_read_only_but_remains_visible(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $account = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Cash]);
        $store->subscription()->update(['status' => SubscriptionStatus::PastDue]);
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('dashboard'))->assertOk();
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

    public function test_plan_limits_block_new_active_products_and_members(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $plan = Plan::create(['code' => 'limited', 'name' => 'Limited', 'monthly_price' => 0, 'max_products' => 1, 'max_members' => 1, 'is_active' => true, 'is_default' => false]);
        $store->subscription()->update(['plan_id' => $plan->id]);
        $category = Category::factory()->for($store)->create();
        $unit = Unit::factory()->for($store)->create();
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->post(route('master-data.products.store'), [
            'idempotency_key' => (string) Str::uuid(), 'name' => 'Produk Kedua', 'sku' => 'LIMIT-2', 'barcode' => null,
            'description' => null, 'category_public_id' => $category->public_id, 'base_unit_public_id' => $unit->public_id,
            'is_active' => true, 'units' => [['unit_public_id' => $unit->public_id, 'conversion_factor' => '1', 'purchase_price' => '10', 'selling_price' => '20']],
        ])->assertSessionHasErrors('name');
        $this->actingAs($owner)->post(route('stores.members.store', $store), ['email' => $member->email, 'role' => MembershipRole::Cashier->value])->assertSessionHasErrors('email');
        $this->actingAs($owner)->post(route('stores.members.store', $store), [
            'mode' => 'create', 'name' => 'Kasir Melebihi Batas', 'email' => 'limit.member@example.com',
            'password' => 'Password123!', 'password_confirmation' => 'Password123!', 'role' => MembershipRole::Cashier->value,
        ])->assertSessionHasErrors('email');
        $this->assertSame(1, Product::query()->where('store_id', $store->id)->count());
        $this->assertDatabaseMissing('store_user', ['store_id' => $store->id, 'user_id' => $member->id, 'status' => MembershipStatus::Active->value]);
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
            ->assertInertia(fn (Assert $page) => $page->component('super-admin/subscriptions/index')->has('plans', 2)->has('subscriptions.data', 2));
        $this->actingAs($admin)->get(route('super-admin.payments.index'))
            ->assertInertia(fn (Assert $page) => $page->component('super-admin/payments/index')->has('payments.data', 1)->where('summary.transactions', 1)->where('summary.amount', 200000));
        $this->actingAs($admin)->get(route('super-admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('metrics.operational_subscriptions', 1)->where('metrics.monthly_recurring_revenue', 200000)->where('metrics.payments_this_month', 200000));
        $this->actingAs($admin)->get(route('super-admin.stores.index'))
            ->assertInertia(fn (Assert $page) => $page->where('stores.data.0.subscription.status', SubscriptionStatus::Active->value)->where('stores.data.0.subscription.plan_name', 'Paid'));
    }
}
