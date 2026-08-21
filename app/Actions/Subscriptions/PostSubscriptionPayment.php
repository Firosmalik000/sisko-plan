<?php

namespace App\Actions\Subscriptions;

use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Platform\RecordAdminAudit;
use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class PostSubscriptionPayment
{
    public function __construct(private IdempotencyGuard $idempotency, private RecordAdminAudit $audit) {}

    public function handle(User $admin, Subscription $subscription, string $amount, string $periodStart, string $periodEnd, string $method, ?string $externalReference, string $paidAt, ?string $notes, string $idempotencyKey, ?string $ipAddress): SubscriptionPayment
    {
        $paidDate = CarbonImmutable::parse($paidAt)->utc();
        $requestHash = $this->idempotency->hash(compact('amount', 'periodStart', 'periodEnd', 'method', 'externalReference', 'notes') + ['subscription_id' => $subscription->id, 'paid_at' => $paidDate->toISOString()]);

        try {
            return DB::transaction(function () use ($admin, $subscription, $amount, $periodStart, $periodEnd, $method, $externalReference, $paidDate, $notes, $idempotencyKey, $requestHash, $ipAddress): SubscriptionPayment {
                $existing = $this->idempotency->existing(fn (): ?SubscriptionPayment => SubscriptionPayment::query()->where('idempotency_key', $idempotencyKey)->lockForUpdate()->first(), $requestHash);
                if ($existing !== null) {
                    return $existing;
                }
                $locked = Subscription::query()->whereKey($subscription->id)->lockForUpdate()->firstOrFail();
                $period = $paidDate->format('Ym');
                DB::table('platform_sequences')->insertOrIgnore(['document_type' => 'subpay', 'period' => $period, 'last_number' => 0, 'created_at' => now(), 'updated_at' => now()]);
                $sequence = DB::table('platform_sequences')->where(['document_type' => 'subpay', 'period' => $period])->lockForUpdate()->firstOrFail();
                $number = ((int) $sequence->last_number) + 1;
                DB::table('platform_sequences')->where('id', $sequence->id)->update(['last_number' => $number, 'updated_at' => now()]);
                $payment = SubscriptionPayment::create([
                    'store_id' => $locked->store_id, 'subscription_id' => $locked->id,
                    'receipt_number' => sprintf('SUBPAY-%s-%05d', $period, $number), 'amount' => $amount,
                    'period_start' => $periodStart, 'period_end' => $periodEnd, 'payment_method' => $method,
                    'external_reference' => $externalReference, 'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash,
                    'paid_at' => $paidDate, 'notes' => $notes, 'created_by_user_id' => $admin->id,
                ]);
                $renewed = $this->renewWhenEligible($locked, $periodStart, $periodEnd);
                $this->audit->handle($admin, 'subscription.payment_posted', $payment, $ipAddress, ['store_id' => $locked->store_id, 'subscription_id' => $locked->id, 'amount' => $amount, 'period_end' => $periodEnd, 'renewed' => $renewed]);

                return $payment;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?SubscriptionPayment => SubscriptionPayment::query()->where('idempotency_key', $idempotencyKey)->first(), $requestHash, $exception);
        }
    }

    private function renewWhenEligible(Subscription $subscription, string $periodStart, string $periodEnd): bool
    {
        if (in_array($subscription->status, [SubscriptionStatus::Suspended, SubscriptionStatus::Cancelled], true)) {
            return false;
        }

        if ($subscription->status === SubscriptionStatus::Active) {
            if ($subscription->current_period_end === null
                || $subscription->current_period_end->gte(CarbonImmutable::parse($periodEnd))) {
                return false;
            }
        }

        $subscription->update([
            'status' => SubscriptionStatus::Active,
            'current_period_start' => $periodStart,
            'current_period_end' => $periodEnd,
            'trial_ends_at' => null,
            'cancelled_at' => null,
        ]);

        return true;
    }
}
