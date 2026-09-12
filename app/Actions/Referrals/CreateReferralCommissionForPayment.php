<?php

namespace App\Actions\Referrals;

use App\Enums\ReferralCommissionStatus;
use App\Models\ReferralAttribution;
use App\Models\ReferralCommission;
use App\Models\SubscriptionPayment;
use App\Support\DecimalPercentage;

class CreateReferralCommissionForPayment
{
    public function handle(SubscriptionPayment $payment): ?ReferralCommission
    {
        if ($payment->user_id === null || $payment->plan_id === null || (string) $payment->amount === '0.0000') {
            return null;
        }

        $plan = $payment->plan;
        $rate = (string) $plan?->referral_commission_rate;
        if ($plan === null || (int) str_replace('.', '', $rate) === 0) {
            return null;
        }

        $attribution = ReferralAttribution::query()->where('referred_user_id', $payment->user_id)->first();
        if ($attribution === null || $attribution->referrer_user_id === $payment->user_id) {
            return null;
        }

        return ReferralCommission::query()->firstOrCreate(
            ['subscription_payment_id' => $payment->id],
            [
                'referrer_user_id' => $attribution->referrer_user_id,
                'referred_user_id' => $payment->user_id,
                'referral_attribution_id' => $attribution->id,
                'plan_id' => $plan->id,
                'plan_name' => $payment->plan_name ?? $plan->name,
                'plan_kind' => $payment->plan_kind ?? $plan->kind,
                'payment_receipt_number' => $payment->receipt_number,
                'commissionable_amount' => $payment->amount,
                'commission_rate' => $rate,
                'commission_amount' => DecimalPercentage::of((string) $payment->amount, $rate),
                'status' => ReferralCommissionStatus::Pending,
                'earned_at' => $payment->paid_at,
            ],
        );
    }
}
