<?php

namespace Tests\Feature;

use App\Actions\Referrals\AttributeReferral;
use App\Actions\Referrals\CreateCommissionPayout;
use App\Actions\Referrals\CreateReferralCommissionForPayment;
use App\Actions\Referrals\MarkCommissionPayoutPaid;
use App\Actions\Referrals\TransitionReferralCommission;
use App\Actions\Subscriptions\BackfillSelfServiceSubscriptionOrders;
use App\Actions\Subscriptions\CompleteSubscriptionOrder;
use App\Actions\Subscriptions\CreateSubscriptionOrder;
use App\Enums\CommissionPayoutStatus;
use App\Enums\ReferralCommissionStatus;
use App\Enums\SubscriptionOrderStatus;
use App\Models\CommissionPayout;
use App\Models\Plan;
use App\Models\ReferralCommission;
use App\Models\Store;
use App\Models\SubscriptionOrder;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Support\Referrals\ReferralIntent;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use Tests\TestCase;

class CustomerReferralTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_capture_remembers_first_referral_and_redirects_to_registration(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();

        $this->get(route('referral.capture', ['code' => strtolower($first->referralCode->code)]))
            ->assertRedirect(route('register'))
            ->assertCookie(ReferralIntent::COOKIE_NAME)
            ->assertSessionHas(ReferralIntent::SESSION_KEY, fn (array $intent): bool => $intent['code'] === $first->referralCode->code);

        $this->get(route('referral.capture', ['code' => $second->referralCode->code]))
            ->assertRedirect(route('register'))
            ->assertSessionHas(ReferralIntent::SESSION_KEY, fn (array $intent): bool => $intent['code'] === $first->referralCode->code);
    }

    public function test_invalid_capture_is_not_stored_and_authenticated_user_is_not_retroactively_attributed(): void
    {
        $this->get(route('referral.capture', ['code' => 'NOTFOUND99']))
            ->assertNotFound()
            ->assertSessionMissing(ReferralIntent::SESSION_KEY);

        $existing = User::factory()->create();
        $referrer = User::factory()->create();
        $this->actingAs($existing)->get(route('referral.capture', ['code' => $referrer->referralCode->code]))
            ->assertRedirect(route('referral.index'))
            ->assertSessionMissing(ReferralIntent::SESSION_KEY);
        $this->assertDatabaseMissing('referral_attributions', ['referred_user_id' => $existing->id]);
    }

    public function test_expired_intent_can_be_replaced_and_does_not_attribute_registration(): void
    {
        $expiredReferrer = User::factory()->create();
        $replacement = User::factory()->create();
        $expired = [
            'code' => $expiredReferrer->referralCode->code,
            'remembered_at' => now()->subDays(ReferralIntent::WINDOW_DAYS)->subSecond()->timestamp,
        ];

        $this->withSession([ReferralIntent::SESSION_KEY => $expired])
            ->get(route('referral.capture', ['code' => $replacement->referralCode->code]))
            ->assertSessionHas(ReferralIntent::SESSION_KEY, fn (array $intent): bool => $intent['code'] === $replacement->referralCode->code);

        $this->withSession([ReferralIntent::SESSION_KEY => $expired])->post(route('register.store'), $this->registrationPayload('expired@example.com'))
            ->assertRedirect(route('dashboard', absolute: false));
        $user = User::query()->where('email', 'expired@example.com')->sole();
        $this->assertDatabaseMissing('referral_attributions', ['referred_user_id' => $user->id]);
    }

    public function test_normal_registration_attributes_pending_referral_and_observer_creates_own_code(): void
    {
        $this->skipUnlessFortifyHas(Features::registration());
        $referrer = User::factory()->create();
        $this->get(route('referral.capture', ['code' => $referrer->referralCode->code]));

        $this->post(route('register.store'), $this->registrationPayload('new-referral@example.com'))
            ->assertRedirect(route('dashboard', absolute: false))
            ->assertSessionMissing(ReferralIntent::SESSION_KEY);

        $newUser = User::query()->where('email', 'new-referral@example.com')->sole();
        $this->assertDatabaseHas('referral_attributions', [
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $newUser->id,
            'referral_code_id' => $referrer->referralCode->id,
        ]);
        $this->assertNotNull($newUser->referralCode()->first());
    }

    public function test_failed_registration_keeps_pending_referral_for_retry(): void
    {
        $this->skipUnlessFortifyHas(Features::registration());
        $referrer = User::factory()->create();
        $this->get(route('referral.capture', ['code' => $referrer->referralCode->code]));

        $this->post(route('register.store'), [
            ...$this->registrationPayload('invalid@example.com'),
            'password_confirmation' => 'different-password',
        ])->assertSessionHasErrors('password')
            ->assertSessionHas(ReferralIntent::SESSION_KEY, fn (array $intent): bool => $intent['code'] === $referrer->referralCode->code);

        $this->assertDatabaseMissing('users', ['email' => 'invalid@example.com']);
    }

    public function test_customer_page_is_account_scoped_available_without_store_and_requires_authentication(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $referred = User::factory()->create(['name' => 'Own Referred User']);
        $otherReferred = User::factory()->create(['name' => 'Private Other Referral']);
        app(AttributeReferral::class)->handle($referred, $owner->referralCode);
        app(AttributeReferral::class)->handle($otherReferred, $other->referralCode);

        $this->get(route('referral.index'))->assertRedirect(route('login'));
        $this->actingAs($owner)->get(route('referral.index'))->assertInertia(fn (Assert $page) => $page
            ->component('customer/referral/index')
            ->where('referral.code', $owner->referralCode->code)
            ->where('metrics.referred_users', 1)
            ->has('referrals.data', 1)
            ->where('referrals.data.0.name', 'Own Referred User')
            ->missing('referrals.data.0.email'));
    }

    public function test_customer_metrics_snapshots_and_privacy_follow_financial_semantics(): void
    {
        CarbonImmutable::setTestNow('2026-09-12 10:00:00');
        $admin = User::factory()->superAdmin()->create();
        $referrer = User::factory()->create();
        $pendingUser = User::factory()->create(['name' => 'Pending User']);
        $approvedUser = User::factory()->create(['name' => 'Approved User']);
        $paidUser = User::factory()->create(['name' => 'Paid User']);
        $reversedUser = User::factory()->create(['name' => 'Reversed User']);
        $plan = Plan::create([
            'code' => 'customer-referral-plan', 'name' => 'Growth Plan', 'kind' => Plan::KIND_BASE,
            'monthly_price' => '1000', 'referral_commission_rate' => '10', 'duration_months' => 1,
            'max_stores' => 1, 'max_products' => 100, 'max_members' => 1, 'max_scans' => 0,
            'is_active' => true, 'is_default' => false,
        ]);

        $pending = $this->commission($admin, $referrer, $pendingUser, $plan, '100');
        $approved = $this->commission($admin, $referrer, $approvedUser, $plan, '200');
        $paid = $this->commission($admin, $referrer, $paidUser, $plan, '300');
        $reversed = $this->commission($admin, $referrer, $reversedUser, $plan, '400');
        $transition = app(TransitionReferralCommission::class);
        $transition->handle($admin, $approved, ReferralCommissionStatus::Approved, null, null);
        $transition->handle($admin, $paid, ReferralCommissionStatus::Approved, null, null);
        $transition->handle($admin, $reversed, ReferralCommissionStatus::Reversed, 'Refunded', null);
        $payout = app(CreateCommissionPayout::class)->handle($admin, $referrer, [$paid->id], 'SAFE-REFERENCE', 'Internal admin note', null);
        app(MarkCommissionPayoutPaid::class)->handle($admin, $payout, null, null, null);
        $plan->update(['referral_commission_rate' => '20']);

        $this->actingAs($referrer)->get(route('referral.index'))->assertInertia(fn (Assert $page) => $page
            ->where('metrics.referred_users', 4)
            ->where('metrics.earning_users', 3)
            ->where('metrics.month_commission', 60)
            ->where('metrics.paid_total', 30)
            ->where('payable.count', 1)
            ->where('payable.total', 20)
            ->where('rates.0.referral_commission_rate', '20.00')
            ->has('commissions.data', 4)
            ->where('commissions.data', fn (Collection $items): bool => $items->contains(fn (array $item): bool => $item['referred_name'] === 'Pending User'
                && $item['commission_rate'] === '10.00'
                && $item['commission_amount'] === '10.0000'))
            ->missing('commissions.data.0.payment_receipt_number')
            ->missing('commissions.data.0.subscription_payment_id')
            ->missing('commissions.data.0.reversal_reason')
            ->missing('commissions.data.0.referred.email')
            ->has('payouts.data', 1)
            ->where('payouts.data.0.reference', 'SAFE-REFERENCE')
            ->missing('payouts.data.0.notes')
            ->missing('payouts.data.0.created_by_user_id')
            ->missing('payouts.data.0.paid_by_user_id'));

        CarbonImmutable::setTestNow();
    }

    public function test_customer_can_request_withdrawal_only_for_own_approved_unpaid_commissions(): void
    {
        $this->post(route('referral.withdrawals.store'))->assertRedirect(route('login'));

        $admin = User::factory()->superAdmin()->create();
        $referrer = User::factory()->create();
        $otherReferrer = User::factory()->create();
        $firstReferred = User::factory()->create();
        $secondReferred = User::factory()->create();
        $pendingReferred = User::factory()->create();
        $otherReferred = User::factory()->create();
        $plan = Plan::create([
            'code' => 'customer-withdrawal-plan', 'name' => 'Withdrawal Plan', 'kind' => Plan::KIND_BASE,
            'monthly_price' => '100', 'referral_commission_rate' => '10', 'duration_months' => 1,
            'max_stores' => 1, 'max_products' => 100, 'max_members' => 1, 'max_scans' => 0,
            'is_active' => true, 'is_default' => false,
        ]);
        $first = $this->commission($admin, $referrer, $firstReferred, $plan, '100');
        $second = $this->commission($admin, $referrer, $secondReferred, $plan, '200');
        $this->commission($admin, $referrer, $pendingReferred, $plan, '300');
        $other = $this->commission($admin, $otherReferrer, $otherReferred, $plan, '400');
        $transitions = app(TransitionReferralCommission::class);
        $transitions->handle($admin, $first, ReferralCommissionStatus::Approved, null, null);
        $transitions->handle($admin, $second, ReferralCommissionStatus::Approved, null, null);
        $transitions->handle($admin, $other, ReferralCommissionStatus::Approved, null, null);

        $this->actingAs($referrer)->post(route('referral.withdrawals.store'))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $payout = CommissionPayout::query()->sole();
        $this->assertSame($referrer->id, $payout->referrer_user_id);
        $this->assertSame($referrer->id, $payout->created_by_user_id);
        $this->assertSame('30.0000', $payout->total_amount);
        $this->assertSame(CommissionPayoutStatus::Pending, $payout->status);
        $this->assertSame(ReferralCommissionStatus::Approved, $first->fresh()->status);
        $this->assertSame(ReferralCommissionStatus::Approved, $second->fresh()->status);
        $this->assertEqualsCanonicalizing([$first->id, $second->id], $payout->items()->pluck('referral_commission_id')->all());
        $this->assertDatabaseHas('audit_logs', [
            'actor_type' => $referrer->getMorphClass(),
            'actor_id' => $referrer->id,
            'action' => 'commission_payout.requested',
        ]);

        $this->actingAs($referrer)->post(route('referral.withdrawals.store'))
            ->assertSessionHasErrors('withdrawal');
        $this->assertDatabaseCount('commission_payouts', 1);
        $this->assertDatabaseCount('commission_payout_items', 2);
        $this->assertDatabaseMissing('commission_payout_items', ['referral_commission_id' => $other->id]);
    }

    public function test_self_service_addon_confirmation_records_exact_payment_and_commission_idempotently(): void
    {
        $referrer = User::factory()->create();
        $referred = User::factory()->create();
        $store = Store::factory()->ownedBy($referred)->create();
        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $addonPlan = Plan::create([
            'code' => 'referral-staff-addon',
            'name' => 'Tambah 1 Staf',
            'kind' => Plan::KIND_ADDON,
            'offer_category' => Plan::CATEGORY_STAFF,
            'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => '30',
            'referral_commission_rate' => '12',
            'duration_months' => 1,
            'max_stores' => 0,
            'max_products' => 0,
            'max_members' => 1,
            'max_scans' => 0,
            'is_active' => true,
            'is_default' => false,
        ]);

        $idempotencyKey = (string) Str::uuid();
        $payload = ['plan_id' => $addonPlan->public_id, 'idempotency_key' => $idempotencyKey];
        $this->actingAs($referred)->post(route('pricing.subscribe'), $payload)
            ->assertRedirect(route('subscription.index'))
            ->assertSessionHasNoErrors();
        $this->actingAs($referred)->post(route('pricing.subscribe'), $payload)
            ->assertRedirect(route('subscription.index'))
            ->assertSessionHasNoErrors();

        $payment = SubscriptionPayment::query()->sole();
        $commission = ReferralCommission::query()->sole();
        $addon = $store->business->subscription->addons()->sole();
        $this->assertSame($addonPlan->id, $payment->plan_id);
        $this->assertSame(Plan::KIND_ADDON, $payment->plan_kind);
        $this->assertSame('30.0000', $payment->amount);
        $this->assertSame('3.6000', $commission->commission_amount);
        $this->assertSame('12.00', $commission->commission_rate);
        $this->assertSame(ReferralCommissionStatus::Pending, $commission->status);
        $this->assertSame(SubscriptionOrderStatus::Paid, SubscriptionOrder::query()->sole()->status);
        $this->assertSame($addon->id, SubscriptionOrder::query()->sole()->subscription_addon_id);

        $this->assertDatabaseCount('subscription_payments', 1);
        $this->assertDatabaseCount('referral_commissions', 1);
    }

    public function test_self_service_paid_base_plan_confirmation_records_payment_and_commission(): void
    {
        $referrer = User::factory()->create();
        $referred = User::factory()->create();
        Store::factory()->ownedBy($referred)->create();
        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $basePlan = Plan::create([
            'code' => 'referral-paid-base',
            'name' => 'Plan Berbayar',
            'kind' => Plan::KIND_BASE,
            'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => '100',
            'referral_commission_rate' => '10',
            'duration_months' => 1,
            'max_stores' => 1,
            'max_products' => 100,
            'max_members' => 2,
            'max_scans' => 100,
            'is_active' => true,
            'is_default' => false,
        ]);

        $this->actingAs($referred)->post(route('pricing.subscribe'), [
            'plan_id' => $basePlan->public_id,
            'idempotency_key' => (string) Str::uuid(),
        ])
            ->assertSessionHasNoErrors();

        $payment = SubscriptionPayment::query()->sole();
        $commission = ReferralCommission::query()->sole();
        $this->assertSame($basePlan->id, $payment->plan_id);
        $this->assertSame(Plan::KIND_BASE, $payment->plan_kind);
        $this->assertSame('100.0000', $payment->amount);
        $this->assertSame('10.0000', $commission->commission_amount);
        $this->assertSame(ReferralCommissionStatus::Pending, $commission->status);
        $this->assertSame(SubscriptionOrderStatus::Paid, SubscriptionOrder::query()->sole()->status);
    }

    public function test_zero_price_order_activates_without_creating_payment_or_commission(): void
    {
        $referrer = User::factory()->create();
        $referred = User::factory()->create();
        Store::factory()->ownedBy($referred)->create();
        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $freePlan = Plan::create([
            'code' => 'alternate-free-plan', 'name' => 'Alternate Free', 'kind' => Plan::KIND_BASE,
            'billing_cycle' => Plan::BILLING_LIFETIME, 'monthly_price' => '0',
            'referral_commission_rate' => '10', 'duration_months' => 1,
            'max_stores' => 1, 'max_products' => 100, 'max_members' => 1, 'max_scans' => 10,
            'is_active' => true, 'is_default' => false,
        ]);

        $this->actingAs($referred)->post(route('pricing.subscribe'), [
            'plan_id' => $freePlan->public_id,
            'idempotency_key' => (string) Str::uuid(),
        ])->assertSessionHasNoErrors();

        $this->assertSame(SubscriptionOrderStatus::Paid, SubscriptionOrder::query()->sole()->status);
        $this->assertNull(SubscriptionOrder::query()->sole()->subscription_payment_id);
        $this->assertDatabaseCount('subscription_payments', 0);
        $this->assertDatabaseCount('referral_commissions', 0);
    }

    public function test_pending_order_does_not_activate_entitlement_and_completion_uses_rate_snapshot(): void
    {
        $referrer = User::factory()->create();
        $referred = User::factory()->create();
        $store = Store::factory()->ownedBy($referred)->create();
        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $addonPlan = Plan::create([
            'code' => 'gateway-ready-addon', 'name' => 'Gateway Ready Add-on', 'kind' => Plan::KIND_ADDON,
            'offer_category' => Plan::CATEGORY_STAFF, 'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => '100', 'referral_commission_rate' => '10', 'duration_months' => 1,
            'max_stores' => 0, 'max_products' => 0, 'max_members' => 1, 'max_scans' => 0,
            'is_active' => true, 'is_default' => false,
        ]);

        $owner = $referred->businessMemberships()->where('business_id', $store->business_id)->sole();
        $order = app(CreateSubscriptionOrder::class)->handle($owner, $addonPlan, (string) Str::uuid());
        $this->assertSame(SubscriptionOrderStatus::Pending, $order->status);
        $this->assertDatabaseCount('subscription_addons', 0);
        $this->assertDatabaseCount('subscription_payments', 0);
        $addonPlan->update([
            'name' => 'Changed Later',
            'kind' => Plan::KIND_BASE,
            'offer_category' => null,
            'monthly_price' => '200',
            'referral_commission_rate' => '20',
            'duration_months' => 2,
            'max_members' => 5,
            'is_active' => false,
        ]);

        app(CompleteSubscriptionOrder::class)->handle($order, null);
        app(CompleteSubscriptionOrder::class)->handle($order, null);

        $commission = ReferralCommission::query()->sole();
        $addon = $store->business->subscription->addons()->sole();
        $this->assertSame('Gateway Ready Add-on', $addon->plan_name);
        $this->assertSame('100.0000', $addon->price);
        $this->assertSame(1, $addon->duration_months);
        $this->assertSame(1, $addon->members);
        $this->assertSame('10.00', $commission->commission_rate);
        $this->assertSame('10.0000', $commission->commission_amount);
        $this->assertSame(ReferralCommissionStatus::Pending, $commission->status);
        $this->assertDatabaseCount('subscription_orders', 1);
        $this->assertDatabaseCount('subscription_addons', 1);
        $this->assertDatabaseCount('subscription_payments', 1);
        $this->assertDatabaseCount('referral_commissions', 1);
    }

    public function test_backfill_reconciles_exact_legacy_self_service_purchase_idempotently(): void
    {
        $referrer = User::factory()->create();
        $referred = User::factory()->create();
        $store = Store::factory()->ownedBy($referred)->create();
        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $subscription = $store->business->subscription;
        $addonPlan = Plan::create([
            'code' => 'legacy-self-service-addon', 'name' => 'Legacy Add-on', 'kind' => Plan::KIND_ADDON,
            'offer_category' => Plan::CATEGORY_STORE, 'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => '50', 'referral_commission_rate' => '8', 'duration_months' => 1,
            'max_stores' => 1, 'max_products' => 0, 'max_members' => 0, 'max_scans' => 0,
            'is_active' => true, 'is_default' => false,
        ]);
        $addon = $subscription->addons()->create([
            'business_id' => $subscription->business_id, 'plan_id' => $addonPlan->id, 'plan_name' => $addonPlan->name,
            'offer_category' => $addonPlan->offer_category, 'price' => '50', 'duration_months' => 1,
            'stores' => 1, 'products' => 0, 'members' => 0, 'scans' => 0,
            'starts_on' => now()->toDateString(), 'ends_on' => now()->addMonth()->subDay()->toDateString(),
            'source' => 'self_service', 'created_by_user_id' => $referred->id,
        ]);

        app(BackfillSelfServiceSubscriptionOrders::class)->handle();
        app(BackfillSelfServiceSubscriptionOrders::class)->handle();

        $this->assertSame($addon->id, SubscriptionOrder::query()->sole()->subscription_addon_id);
        $this->assertSame(SubscriptionOrderStatus::Paid, SubscriptionOrder::query()->sole()->status);
        $this->assertSame($addonPlan->id, SubscriptionPayment::query()->sole()->plan_id);
        $this->assertSame('4.0000', ReferralCommission::query()->sole()->commission_amount);
        $this->assertDatabaseCount('subscription_orders', 1);
        $this->assertDatabaseCount('subscription_payments', 1);
        $this->assertDatabaseCount('referral_commissions', 1);
    }

    /** @return array<string, string> */
    private function registrationPayload(string $email): array
    {
        return ['name' => 'New Referral User', 'email' => $email, 'password' => 'password', 'password_confirmation' => 'password'];
    }

    private function commission(User $admin, User $referrer, User $referred, Plan $plan, string $amount): ReferralCommission
    {
        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $store = Store::factory()->ownedBy($referred)->create();
        $subscription = $store->business->subscription;
        $subscription->update(['plan_id' => $plan->id]);
        $payment = SubscriptionPayment::create([
            'purchaser_user_id' => $referred->id,
            'business_id' => $subscription->business_id,
            'subscription_id' => $subscription->id,
            'plan_id' => $plan->id,
            'plan_name' => $plan->name,
            'plan_kind' => $plan->kind,
            'receipt_number' => 'TEST-'.Str::upper(Str::random(12)),
            'amount' => $amount,
            'period_start' => now()->startOfMonth()->toDateString(),
            'period_end' => now()->endOfMonth()->toDateString(),
            'payment_method' => 'cash',
            'idempotency_key' => (string) Str::uuid(),
            'request_hash' => hash('sha256', (string) Str::uuid()),
            'paid_at' => now(),
            'created_by_user_id' => $admin->id,
        ]);

        return app(CreateReferralCommissionForPayment::class)->handle($payment) ?? throw new \RuntimeException('Commission was not created.');
    }
}
