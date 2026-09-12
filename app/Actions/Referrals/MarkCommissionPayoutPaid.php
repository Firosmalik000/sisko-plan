<?php

namespace App\Actions\Referrals;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\CommissionPayoutStatus;
use App\Enums\ReferralCommissionStatus;
use App\Models\CommissionPayout;
use App\Models\ReferralCommission;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MarkCommissionPayoutPaid
{
    public function __construct(private RecordAdminAudit $audit) {}

    public function handle(User $admin, CommissionPayout $payout, ?string $reference, ?string $notes, ?string $ipAddress): CommissionPayout
    {
        return DB::transaction(function () use ($admin, $payout, $reference, $notes, $ipAddress): CommissionPayout {
            $locked = CommissionPayout::query()->with('items')->lockForUpdate()->findOrFail($payout->id);
            if ($locked->status === CommissionPayoutStatus::Paid) {
                return $locked;
            }
            $commissionIds = $locked->items->pluck('referral_commission_id');
            $commissions = ReferralCommission::query()->whereIn('id', $commissionIds)->lockForUpdate()->get();
            if ($commissions->count() !== $commissionIds->count() || $commissions->contains(fn (ReferralCommission $commission): bool => $commission->status !== ReferralCommissionStatus::Approved)) {
                throw ValidationException::withMessages(['payout' => __('All payout commissions must still be approved.')]);
            }
            ReferralCommission::query()->whereIn('id', $commissionIds)->update(['status' => ReferralCommissionStatus::Paid, 'paid_at' => now()]);
            $locked->update(['status' => CommissionPayoutStatus::Paid, 'reference' => $reference ?? $locked->reference, 'notes' => $notes ?? $locked->notes, 'paid_by_user_id' => $admin->id, 'paid_at' => now()]);
            $this->audit->handle($admin, 'commission_payout.paid', $locked, $ipAddress, ['commission_ids' => $commissionIds->all(), 'total_amount' => $locked->total_amount]);

            return $locked;
        }, 3);
    }
}
