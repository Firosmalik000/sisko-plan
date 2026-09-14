<?php

namespace App\Actions\Referrals;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\ReferralCommissionStatus;
use App\Models\ReferralCommission;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransitionReferralCommission
{
    public function __construct(private RecordAdminAudit $audit) {}

    public function handle(User $admin, ReferralCommission $commission, ReferralCommissionStatus $target, ?string $reason, ?string $ipAddress): ReferralCommission
    {
        return DB::transaction(function () use ($admin, $commission, $target, $reason, $ipAddress): ReferralCommission {
            $locked = ReferralCommission::query()->lockForUpdate()->findOrFail($commission->id);
            $allowed = match ($locked->status) {
                ReferralCommissionStatus::Pending => [ReferralCommissionStatus::Approved, ReferralCommissionStatus::Reversed],
                ReferralCommissionStatus::Approved => [ReferralCommissionStatus::Reversed],
                default => [],
            };
            if (! in_array($target, $allowed, true) || ($target === ReferralCommissionStatus::Reversed && blank($reason))) {
                throw ValidationException::withMessages(['status' => __('This commission transition is not allowed.')]);
            }
            if ($locked->payoutItem()->exists()) {
                throw ValidationException::withMessages(['status' => __('A commission included in a payout cannot be changed.')]);
            }

            $before = $locked->status->value;
            $locked->update($target === ReferralCommissionStatus::Approved
                ? ['status' => $target, 'approved_at' => now()]
                : ['status' => $target, 'reversed_at' => now(), 'reversal_reason' => $reason]);
            $this->audit->handle($admin, $target === ReferralCommissionStatus::Approved ? 'referral_commission.approved' : 'referral_commission.reversed', $locked, $ipAddress, ['before' => $before, 'after' => $target->value, 'reason' => $reason]);

            return $locked;
        }, 3);
    }
}
