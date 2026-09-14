<?php

namespace App\Actions\Subscriptions;

use App\Actions\Ledgers\IdempotencyGuard;
use App\Enums\SubscriptionOrderStatus;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionOrder;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class CreateSubscriptionOrder
{
    public function __construct(private IdempotencyGuard $idempotency) {}

    public function handle(User $owner, Plan $plan, string $idempotencyKey): SubscriptionOrder
    {
        $requestHash = $this->idempotency->hash([
            'user_id' => $owner->id,
            'plan_id' => $plan->id,
        ]);

        try {
            return DB::transaction(function () use ($owner, $plan, $idempotencyKey, $requestHash): SubscriptionOrder {
                $existing = $this->idempotency->existing(
                    fn (): ?SubscriptionOrder => SubscriptionOrder::query()
                        ->where('idempotency_key', $idempotencyKey)
                        ->lockForUpdate()
                        ->first(),
                    $requestHash,
                );
                if ($existing !== null) {
                    return $existing;
                }

                User::query()->whereKey($owner->id)->lockForUpdate()->firstOrFail();
                $subscription = Subscription::query()->where('user_id', $owner->id)->lockForUpdate()->firstOrFail();
                $selectedPlan = Plan::query()->whereKey($plan->id)->where('is_active', true)->lockForUpdate()->firstOrFail();

                return SubscriptionOrder::create([
                    'user_id' => $owner->id,
                    'subscription_id' => $subscription->id,
                    'plan_id' => $selectedPlan->id,
                    'plan_name' => $selectedPlan->name,
                    'plan_kind' => $selectedPlan->kind,
                    'amount' => $selectedPlan->monthly_price,
                    'referral_commission_rate' => $selectedPlan->referral_commission_rate,
                    'plan_snapshot' => $selectedPlan->only([
                        'name', 'kind', 'offer_category', 'billing_cycle', 'monthly_price', 'duration_months',
                        'max_stores', 'max_products', 'max_members', 'max_scans', 'is_trial',
                    ]),
                    'status' => SubscriptionOrderStatus::Pending,
                    'provider' => 'manual',
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash,
                    'created_by_user_id' => $owner->id,
                ]);
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(
                fn (): ?SubscriptionOrder => SubscriptionOrder::query()->where('idempotency_key', $idempotencyKey)->first(),
                $requestHash,
                $exception,
            );
        }
    }
}
