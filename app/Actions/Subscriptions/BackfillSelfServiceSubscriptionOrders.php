<?php

namespace App\Actions\Subscriptions;

use App\Actions\Referrals\CreateReferralCommissionForPayment;
use App\Enums\SubscriptionOrderStatus;
use App\Models\Plan;
use App\Models\SubscriptionAddon;
use App\Models\SubscriptionOrder;
use App\Models\SubscriptionPayment;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use Carbon\CarbonImmutable;

class BackfillSelfServiceSubscriptionOrders
{
    public function __construct(
        private RecordSelfServiceSubscriptionPayment $payments,
        private CreateReferralCommissionForPayment $commissions,
    ) {}

    public function handle(): void
    {
        SubscriptionAddon::query()->with(['subscription', 'plan'])
            ->where('source', 'self_service')->where('price', '>', 0)
            ->orderBy('id')->each(fn (SubscriptionAddon $addon) => $this->backfill($addon, 'addon'));

        SubscriptionPeriod::query()->with(['subscription', 'plan'])
            ->where('source', 'self_service')->where('monthly_price', '>', 0)
            ->orderBy('id')->each(fn (SubscriptionPeriod $period) => $this->backfill($period, 'period'));
    }

    private function backfill(SubscriptionAddon|SubscriptionPeriod $source, string $type): void
    {
        $sourceKey = "{$type}:{$source->public_id}";
        $amount = (string) ($source instanceof SubscriptionAddon ? $source->price : $source->monthly_price);
        $startsOn = CarbonImmutable::parse($source instanceof SubscriptionAddon ? $source->starts_on : $source->period_start);
        $endsOnValue = $source instanceof SubscriptionAddon ? $source->ends_on : $source->period_end;
        $endsOn = $endsOnValue === null ? null : CarbonImmutable::parse($endsOnValue);
        $owner = User::query()->findOrFail($source->user_id);
        $plan = $source->plan;
        $oldPaymentKey = hash('sha256', "self-service:{$sourceKey}");
        $payment = SubscriptionPayment::query()->where('idempotency_key', $oldPaymentKey)->first();

        $order = SubscriptionOrder::query()->firstOrCreate(
            [$type === 'addon' ? 'subscription_addon_id' : 'subscription_period_id' => $source->id],
            [
                'user_id' => $owner->id,
                'subscription_id' => $source->subscription_id,
                'plan_id' => $plan->id,
                'plan_name' => $source->plan_name,
                'plan_kind' => $plan->kind,
                'amount' => $amount,
                'referral_commission_rate' => $plan->referral_commission_rate,
                'plan_snapshot' => $this->snapshot($plan),
                'status' => SubscriptionOrderStatus::Pending,
                'provider' => 'manual',
                'idempotency_key' => hash('sha256', "backfill:{$sourceKey}"),
                'request_hash' => hash('sha256', "backfill:{$sourceKey}:{$amount}"),
                'created_by_user_id' => $source->created_by_user_id ?? $owner->id,
                'created_at' => $source->created_at,
                'updated_at' => $source->updated_at,
            ],
        );

        $payment ??= $this->payments->handle(
            $owner,
            $source->subscription,
            $plan,
            $amount,
            $startsOn,
            $endsOn,
            $sourceKey,
            $source->created_at->toImmutable(),
        );
        if ($payment !== null) {
            $this->commissions->handle($payment);
        }

        $order->update([
            'subscription_payment_id' => $payment?->id,
            'status' => SubscriptionOrderStatus::Paid,
            'paid_at' => $payment->paid_at,
        ]);
    }

    /** @return array<string, mixed> */
    private function snapshot(Plan $plan): array
    {
        return $plan->only([
            'name', 'kind', 'offer_category', 'billing_cycle', 'monthly_price', 'duration_months',
            'max_stores', 'max_products', 'max_members', 'max_scans', 'is_trial',
        ]);
    }
}
