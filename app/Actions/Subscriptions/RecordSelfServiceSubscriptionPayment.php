<?php

namespace App\Actions\Subscriptions;

use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Referrals\CreateReferralCommissionForPayment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class RecordSelfServiceSubscriptionPayment
{
    public function __construct(
        private IdempotencyGuard $idempotency,
        private CreateReferralCommissionForPayment $createCommission,
    ) {}

    public function handle(
        User $owner,
        Subscription $subscription,
        Plan $plan,
        string $amount,
        CarbonImmutable $periodStart,
        ?CarbonImmutable $periodEnd,
        string $sourceKey,
        ?CarbonImmutable $paidAt = null,
        ?string $commissionRate = null,
    ): ?SubscriptionPayment {
        if (Decimal::compare($amount, '0', Decimal::MONEY_SCALE) <= 0) {
            return null;
        }

        $paidAt = ($paidAt ?? CarbonImmutable::now())->utc();
        $idempotencyKey = hash('sha256', "self-service:{$sourceKey}");
        $requestHash = $this->idempotency->hash([
            'source_key' => $sourceKey,
            'user_id' => $owner->id,
            'subscription_id' => $subscription->id,
            'plan_id' => $plan->id,
            'amount' => $amount,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd?->toDateString(),
            'commission_rate' => $commissionRate,
        ]);

        try {
            return DB::transaction(function () use ($owner, $subscription, $plan, $amount, $periodStart, $periodEnd, $paidAt, $idempotencyKey, $requestHash, $commissionRate): SubscriptionPayment {
                $existing = $this->idempotency->existing(
                    fn (): ?SubscriptionPayment => SubscriptionPayment::query()
                        ->where('idempotency_key', $idempotencyKey)
                        ->lockForUpdate()
                        ->first(),
                    $requestHash,
                );
                if ($existing !== null) {
                    return $existing;
                }

                $lockedSubscription = Subscription::query()
                    ->whereKey($subscription->id)
                    ->where('user_id', $owner->id)
                    ->lockForUpdate()
                    ->firstOrFail();
                $lockedPlan = Plan::query()->whereKey($plan->id)->lockForUpdate()->firstOrFail();
                $period = $paidAt->format('Ym');
                DB::table('platform_sequences')->insertOrIgnore([
                    'document_type' => 'subpay',
                    'period' => $period,
                    'last_number' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $sequence = DB::table('platform_sequences')
                    ->where(['document_type' => 'subpay', 'period' => $period])
                    ->lockForUpdate()
                    ->firstOrFail();
                $number = ((int) $sequence->last_number) + 1;
                DB::table('platform_sequences')->where('id', $sequence->id)->update([
                    'last_number' => $number,
                    'updated_at' => now(),
                ]);

                $payment = SubscriptionPayment::create([
                    'user_id' => $owner->id,
                    'store_id' => $lockedSubscription->store_id,
                    'subscription_id' => $lockedSubscription->id,
                    'plan_id' => $lockedPlan->id,
                    'plan_name' => $lockedPlan->name,
                    'plan_kind' => $lockedPlan->kind,
                    'receipt_number' => sprintf('SUBPAY-%s-%05d', $period, $number),
                    'amount' => $amount,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd ?? $periodStart,
                    'payment_method' => 'other',
                    'external_reference' => null,
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash,
                    'paid_at' => $paidAt,
                    'notes' => null,
                    'created_by_user_id' => $owner->id,
                ]);
                $payment->setRelation('plan', $lockedPlan);
                $this->createCommission->handle($payment, $commissionRate);

                return $payment;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(
                fn (): ?SubscriptionPayment => SubscriptionPayment::query()->where('idempotency_key', $idempotencyKey)->first(),
                $requestHash,
                $exception,
            );
        }
    }
}
