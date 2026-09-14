<?php

namespace App\Actions\Referrals;

use App\Actions\Audit\RecordAudit;
use App\Actions\Platform\RecordAdminAudit;
use App\Enums\CommissionPayoutStatus;
use App\Enums\ReferralCommissionStatus;
use App\Models\CommissionPayout;
use App\Models\ReferralCommission;
use App\Models\User;
use App\Support\DecimalAmount;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateCommissionPayout
{
    public function __construct(
        private RecordAdminAudit $adminAudit,
        private RecordAudit $customerAudit,
    ) {}

    /** @param array<int, int> $commissionIds */
    public function handle(User $admin, User $referrer, array $commissionIds, ?string $reference, ?string $notes, ?string $ipAddress): CommissionPayout
    {
        return $this->create($admin, $referrer, $commissionIds, $reference, $notes, $ipAddress, false);
    }

    /** @param array<int, int> $commissionIds */
    public function request(User $referrer, array $commissionIds, ?string $ipAddress): CommissionPayout
    {
        return $this->create($referrer, $referrer, $commissionIds, null, null, $ipAddress, true);
    }

    /** @param array<int, int> $commissionIds */
    private function create(User $actor, User $referrer, array $commissionIds, ?string $reference, ?string $notes, ?string $ipAddress, bool $customerRequested): CommissionPayout
    {
        try {
            return DB::transaction(function () use ($actor, $referrer, $commissionIds, $reference, $notes, $ipAddress, $customerRequested): CommissionPayout {
                $commissions = ReferralCommission::query()->whereIn('id', $commissionIds)->lockForUpdate()->get();
                if ($commissions->count() !== count(array_unique($commissionIds)) || $commissions->isEmpty()
                    || $commissions->contains(fn (ReferralCommission $item): bool => $item->referrer_user_id !== $referrer->id
                        || $item->status !== ReferralCommissionStatus::Approved || $item->payoutItem()->exists())) {
                    throw ValidationException::withMessages(['commissions' => __('Only approved unpaid commissions for one referrer may be paid out.')]);
                }

                $total = DecimalAmount::sum($commissions->pluck('commission_amount')->all());
                $payout = CommissionPayout::create([
                    'referrer_user_id' => $referrer->id, 'total_amount' => $total,
                    'status' => CommissionPayoutStatus::Pending, 'reference' => $reference,
                    'notes' => $notes, 'created_by_user_id' => $actor->id,
                ]);
                foreach ($commissions as $commission) {
                    $payout->items()->create(['referral_commission_id' => $commission->id, 'amount' => $commission->commission_amount]);
                }
                $metadata = ['referrer_user_id' => $referrer->id, 'commission_ids' => $commissions->pluck('id')->all(), 'total_amount' => $total];
                if ($customerRequested) {
                    $this->customerAudit->handle($actor, 'commission_payout.requested', $payout, null, $ipAddress, $metadata);
                } else {
                    $this->adminAudit->handle($actor, 'commission_payout.created', $payout, $ipAddress, $metadata);
                }

                return $payout;
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['commissions' => __('Only approved unpaid commissions for one referrer may be paid out.')]);
        }
    }
}
