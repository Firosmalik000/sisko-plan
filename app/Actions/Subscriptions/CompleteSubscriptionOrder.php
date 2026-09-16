<?php

namespace App\Actions\Subscriptions;

use App\Enums\SubscriptionOrderStatus;
use App\Models\BusinessMembership;
use App\Models\SubscriptionAddon;
use App\Models\SubscriptionOrder;
use App\Models\SubscriptionPeriod;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompleteSubscriptionOrder
{
    public function __construct(
        private PurchaseSubscriptionAddon $purchaseAddon,
        private SelectSubscriptionPlan $selectPlan,
        private RecordSelfServiceSubscriptionPayment $payments,
    ) {}

    public function handle(SubscriptionOrder $order, ?string $ipAddress): SubscriptionOrder
    {
        return DB::transaction(function () use ($order, $ipAddress): SubscriptionOrder {
            $locked = SubscriptionOrder::query()->lockForUpdate()->findOrFail($order->id);
            if ($locked->status === SubscriptionOrderStatus::Paid) {
                return $locked->load(['period', 'addon', 'payment']);
            }
            if ($locked->status !== SubscriptionOrderStatus::Pending) {
                throw ValidationException::withMessages(['plan_id' => __('This subscription order cannot be completed.')]);
            }

            $locked->load(['user', 'subscription', 'plan', 'period', 'addon']);
            $owner = BusinessMembership::query()
                ->where('business_id', $locked->subscription->business_id)
                ->where('user_id', $locked->user_id)
                ->where('business_role', 'owner')
                ->where('status', 'active')
                ->firstOrFail();
            $period = $locked->period;
            $addon = $locked->addon;
            if ($period === null && $addon === null) {
                if ($locked->plan_kind === 'addon') {
                    $addon = $this->purchaseAddon->handle($owner, $locked->plan, $ipAddress, $locked->plan_snapshot);
                } else {
                    $period = $this->selectPlan->handle($owner, $locked->plan, $ipAddress, $locked->plan_snapshot)['period'];
                }
            }

            [$periodStart, $periodEnd] = $this->dates($period, $addon);
            $paymentId = null;
            $paidAt = now();
            if (Decimal::compare($locked->amount, '0', Decimal::MONEY_SCALE) > 0) {
                $payment = $this->payments->handle(
                    $locked->user,
                    $locked->subscription,
                    $locked->plan,
                    $locked->amount,
                    $periodStart,
                    $periodEnd,
                    "order:{$locked->public_id}",
                    null,
                    $locked->referral_commission_rate,
                );
                if ($payment === null) {
                    throw new \LogicException('A positive subscription order requires a payment record.');
                }
                $paymentId = $payment->id;
                $paidAt = $payment->paid_at;
            }

            $locked->update([
                'subscription_period_id' => $period?->id,
                'subscription_addon_id' => $addon?->id,
                'subscription_payment_id' => $paymentId,
                'status' => SubscriptionOrderStatus::Paid,
                'paid_at' => $paidAt,
            ]);

            return $locked->load(['period', 'addon', 'payment']);
        }, 3);
    }

    /** @return array{CarbonImmutable, CarbonImmutable|null} */
    private function dates(?SubscriptionPeriod $period, ?SubscriptionAddon $addon): array
    {
        if ($period !== null) {
            return [
                CarbonImmutable::parse($period->period_start),
                $period->period_end === null ? null : CarbonImmutable::parse($period->period_end),
            ];
        }

        if ($addon !== null) {
            return [
                CarbonImmutable::parse($addon->starts_on),
                $addon->ends_on === null ? null : CarbonImmutable::parse($addon->ends_on),
            ];
        }

        throw new \LogicException('A completed subscription order requires an entitlement source.');
    }
}
