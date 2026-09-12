<?php

namespace Tests\Feature;

use App\Actions\Referrals\AttributeReferral;
use App\Actions\Referrals\CreateCommissionPayout;
use App\Actions\Referrals\MarkCommissionPayoutPaid;
use App\Actions\Referrals\TransitionReferralCommission;
use App\Actions\Subscriptions\PostSubscriptionPayment;
use App\Enums\CommissionPayoutStatus;
use App\Enums\ReferralCommissionStatus;
use App\Models\Plan;
use App\Models\ReferralCommission;
use App\Models\Store;
use App\Models\User;
use App\Support\PlatformPermission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReferralCommissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_referral_codes_are_unique_stable_and_attribution_is_first_valid_referral(): void
    {
        $first = User::factory()->create(['name' => 'First']);
        $second = User::factory()->create();
        $referred = User::factory()->create();

        $this->assertNotNull($first->referralCode);
        $this->assertNotSame($first->referralCode->code, $second->referralCode->code);
        $code = $first->referralCode->code;
        $first->update(['name' => 'Renamed']);
        $this->assertSame($code, $first->fresh()->referralCode->code);

        $attribution = app(AttributeReferral::class)->handle($referred, $first->referralCode);
        $same = app(AttributeReferral::class)->handle($referred, $second->referralCode);
        $this->assertTrue($attribution->is($same));
        $this->assertSame($first->id, $same->referrer_user_id);
        $this->assertDatabaseCount('referral_attributions', 1);

        $this->expectException(ValidationException::class);
        app(AttributeReferral::class)->handle($first, $first->referralCode);
    }

    public function test_successful_payment_creates_one_snapshot_commission_and_renewal_uses_new_rate(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $referrer = User::factory()->create(['name' => 'Madun']);
        $referred = User::factory()->create(['name' => 'Andi']);
        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $store = Store::factory()->for($referred, 'owner')->create();
        $plan = Plan::create([
            'code' => 'plan-a', 'name' => 'Plan A', 'kind' => Plan::KIND_BASE, 'monthly_price' => '100000',
            'referral_commission_rate' => '10', 'max_stores' => 1, 'max_products' => 10, 'max_members' => 1,
            'max_scans' => 0, 'is_active' => true, 'is_default' => false,
        ]);
        $subscription = $store->subscription()->sole();
        $subscription->update(['plan_id' => $plan->id]);
        $key = (string) Str::uuid();
        $action = app(PostSubscriptionPayment::class);

        $first = $action->handle($admin, $subscription, '100000', '2026-09-01', '2026-09-30', 'bank_transfer', null, '2026-09-01T10:00:00Z', null, $key, null);
        $action->handle($admin, $subscription, '100000', '2026-09-01', '2026-09-30', 'bank_transfer', null, '2026-09-01T10:00:00Z', null, $key, null);

        $commission = ReferralCommission::query()->sole();
        $this->assertSame($plan->id, $first->plan_id);
        $this->assertSame('Plan A', $first->plan_name);
        $this->assertSame('100000.0000', $commission->commissionable_amount);
        $this->assertSame('10.00', $commission->commission_rate);
        $this->assertSame('10000.0000', $commission->commission_amount);
        $this->assertSame(ReferralCommissionStatus::Pending, $commission->status);
        $this->assertSame($referrer->id, $commission->referrer_user_id);
        $this->assertSame($referred->id, $commission->referred_user_id);
        $this->assertDatabaseCount('referral_commissions', 1);

        $plan->update(['name' => 'Plan A Baru', 'referral_commission_rate' => '15']);
        $this->assertSame('10.00', $commission->fresh()->commission_rate);
        $this->assertSame('Plan A', $commission->fresh()->plan_name);
        $action->handle($admin, $subscription, '100000', '2026-10-01', '2026-10-31', 'bank_transfer', null, '2026-10-01T10:00:00Z', null, (string) Str::uuid(), null);
        $this->assertSame('15000.0000', ReferralCommission::query()->latest('id')->firstOrFail()->commission_amount);
        $this->assertDatabaseCount('referral_commissions', 2);
    }

    public function test_ineligible_payments_do_not_create_commissions_and_decimal_rate_is_exact(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $referrer = User::factory()->create();
        $referred = User::factory()->create();
        $store = Store::factory()->for($referred, 'owner')->create();
        $plan = Plan::create(['code' => 'decimal', 'name' => 'Decimal', 'monthly_price' => '99.9900', 'referral_commission_rate' => '12.50', 'max_stores' => 1, 'max_products' => 0, 'max_members' => 0, 'is_active' => true, 'is_default' => false]);
        $subscription = $store->subscription()->sole();
        $subscription->update(['plan_id' => $plan->id]);
        $action = app(PostSubscriptionPayment::class);
        $action->handle($admin, $subscription, '99.99', '2026-09-01', '2026-09-30', 'cash', null, now()->toISOString(), null, (string) Str::uuid(), null);
        $this->assertDatabaseCount('referral_commissions', 0);

        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $plan->update(['referral_commission_rate' => '12.50']);
        $action->handle($admin, $subscription, '0', '2026-10-15', '2026-10-15', 'cash', null, now()->toISOString(), null, (string) Str::uuid(), null);
        $this->assertDatabaseCount('referral_commissions', 0);
        $plan->update(['referral_commission_rate' => '0']);
        $action->handle($admin, $subscription, '99.99', '2026-10-01', '2026-10-31', 'cash', null, now()->toISOString(), null, (string) Str::uuid(), null);
        $this->assertDatabaseCount('referral_commissions', 0);

        $plan->update(['referral_commission_rate' => '12.50']);
        $action->handle($admin, $subscription, '99.99', '2026-11-01', '2026-11-30', 'cash', null, now()->toISOString(), null, (string) Str::uuid(), null);
        $this->assertSame('12.4988', ReferralCommission::query()->sole()->commission_amount);
    }

    public function test_commission_transitions_and_payout_are_controlled_atomic_and_idempotent(): void
    {
        [$admin, $referrer, $commission] = $this->commissionFixture();
        $transition = app(TransitionReferralCommission::class);
        try {
            app(CreateCommissionPayout::class)->handle($admin, $referrer, [$commission->id], null, null, null);
            $this->fail('Pending commissions cannot be paid out.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('commission_payouts', 0);
        }
        $transition->handle($admin, $commission, ReferralCommissionStatus::Approved, null, null);
        $this->assertSame(ReferralCommissionStatus::Approved, $commission->fresh()->status);

        $payout = app(CreateCommissionPayout::class)->handle($admin, $referrer, [$commission->id], 'BANK-01', 'Manual transfer', null);
        $this->assertSame('10000.0000', $payout->total_amount);
        $this->assertDatabaseHas('commission_payout_items', ['referral_commission_id' => $commission->id, 'amount' => 10000]);

        try {
            app(CreateCommissionPayout::class)->handle($admin, $referrer, [$commission->id], null, null, null);
            $this->fail('A commission must not be included in two payouts.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('commission_payouts', 1);
        }

        $paid = app(MarkCommissionPayoutPaid::class)->handle($admin, $payout, null, null, null);
        app(MarkCommissionPayoutPaid::class)->handle($admin, $paid, null, null, null);
        $this->assertSame(CommissionPayoutStatus::Paid, $paid->fresh()->status);
        $this->assertSame(ReferralCommissionStatus::Paid, $commission->fresh()->status);
        $this->assertDatabaseCount('admin_audit_logs', 4);

        $this->expectException(ValidationException::class);
        $transition->handle($admin, $commission->fresh(), ReferralCommissionStatus::Reversed, 'Tidak valid', null);
    }

    public function test_plan_rate_validation_and_referral_routes_enforce_permissions(): void
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->syncPermissions([PlatformPermission::REFERRALS_VIEW]);
        $this->actingAs($admin)->get(route('super-admin.referral-commission.overview'))->assertOk();
        $this->actingAs($admin)->get(route('super-admin.referral-commission.commissions'))->assertForbidden();
        $this->actingAs($admin)->get(route('super-admin.referral-commission.payouts'))->assertForbidden();

        [, , $commission] = $this->commissionFixture();
        $this->actingAs($admin)->patch(route('super-admin.referral-commission.commissions.update', $commission), ['status' => 'approved'])->assertForbidden();
        $this->actingAs($admin)->post(route('super-admin.referral-commission.payouts.store'), [])->assertForbidden();

        $plan = Plan::query()->where('is_default', false)->firstOrFail();
        $payload = [
            'name' => $plan->name, 'description' => $plan->description, 'kind' => $plan->kind,
            'offer_category' => $plan->offer_category, 'billing_cycle' => $plan->billing_cycle,
            'monthly_price' => $plan->monthly_price, 'duration_months' => $plan->duration_months,
            'max_stores' => $plan->max_stores, 'max_products' => $plan->max_products,
            'max_members' => $plan->max_members, 'max_scans' => $plan->max_scans, 'is_active' => true,
        ];
        $super = User::factory()->superAdmin()->create();
        foreach (['-0.01', '100.01'] as $invalid) {
            $this->actingAs($super)->patch(route('super-admin.plans.update', $plan), [...$payload, 'referral_commission_rate' => $invalid])->assertSessionHasErrors('referral_commission_rate');
        }
        foreach (['0', '12.50', '100'] as $valid) {
            $this->actingAs($super)->patch(route('super-admin.plans.update', $plan), [...$payload, 'referral_commission_rate' => $valid])->assertSessionHasNoErrors();
        }
        $this->assertSame('100.00', $plan->fresh()->referral_commission_rate);
    }

    public function test_super_admin_pages_expose_auditable_referral_commission_and_payout_data(): void
    {
        [$admin, $referrer, $commission] = $this->commissionFixture();
        app(TransitionReferralCommission::class)->handle($admin, $commission, ReferralCommissionStatus::Approved, null, null);

        $this->actingAs($admin)->get(route('super-admin.referral-commission.overview'))
            ->assertInertia(fn (Assert $page) => $page->component('platform/referral-commission/index')
                ->where('tab', 'overview')->where('metrics.relationships', 1)->has('recent_commissions', 1));
        $this->actingAs($admin)->get(route('super-admin.referral-commission.referrals', ['referrer' => $referrer->referralCode->public_id]))
            ->assertInertia(fn (Assert $page) => $page->where('tab', 'referrals')->has('referrers.data', 1)
                ->where('selected_referrer.name', $referrer->name)->has('selected_referrer.users', 1));
        $this->actingAs($admin)->get(route('super-admin.referral-commission.commissions', ['status' => 'approved']))
            ->assertInertia(fn (Assert $page) => $page->where('tab', 'commissions')->has('commissions.data', 1)
                ->where('commissions.data.0.payment_receipt_number', $commission->payment_receipt_number));

        app(CreateCommissionPayout::class)->handle($admin, $referrer, [$commission->id], 'TRANSFER-01', null, null);
        $this->actingAs($admin)->get(route('super-admin.referral-commission.payouts'))
            ->assertInertia(fn (Assert $page) => $page->where('tab', 'payouts')->has('payable', 0)->has('payouts.data', 1)
                ->where('payouts.data.0.items.0.commission.public_id', $commission->public_id));
    }

    /** @return array{User, User, ReferralCommission} */
    private function commissionFixture(): array
    {
        $admin = User::factory()->superAdmin()->create();
        $referrer = User::factory()->create();
        $referred = User::factory()->create();
        app(AttributeReferral::class)->handle($referred, $referrer->referralCode);
        $store = Store::factory()->for($referred, 'owner')->create();
        $plan = Plan::create(['code' => 'payable', 'name' => 'Payable', 'monthly_price' => '100000', 'referral_commission_rate' => '10', 'max_stores' => 1, 'max_products' => 0, 'max_members' => 0, 'is_active' => true, 'is_default' => false]);
        $subscription = $store->subscription()->sole();
        $subscription->update(['plan_id' => $plan->id]);
        app(PostSubscriptionPayment::class)->handle($admin, $subscription, '100000', '2026-09-01', '2026-09-30', 'cash', null, now()->toISOString(), null, (string) Str::uuid(), null);

        return [$admin, $referrer, ReferralCommission::query()->sole()];
    }
}
