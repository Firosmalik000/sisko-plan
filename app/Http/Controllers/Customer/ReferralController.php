<?php

namespace App\Http\Controllers\Customer;

use App\Actions\Referrals\CreateCommissionPayout;
use App\Enums\ReferralCommissionStatus;
use App\Http\Controllers\Controller;
use App\Models\CommissionPayout;
use App\Models\Plan;
use App\Models\ReferralAttribution;
use App\Models\ReferralCommission;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReferralController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $code = $user->referralCode()->firstOrFail();
        $validStatuses = [
            ReferralCommissionStatus::Pending,
            ReferralCommissionStatus::Approved,
            ReferralCommissionStatus::Paid,
        ];

        $referrals = $user->referralsMade()
            ->with('referred:id,name')
            ->withSum(['commissions as commission_total' => fn ($query) => $query->whereIn('status', $validStatuses)], 'commission_amount')
            ->latest('attributed_at')
            ->paginate(8, ['*'], 'referrals_page')
            ->withQueryString()
            ->through(fn (ReferralAttribution $attribution): array => [
                'name' => $attribution->referred->name,
                'attributed_at' => $attribution->attributed_at,
                'commission_total' => $attribution->commission_total ?? '0',
            ]);

        $commissions = $user->referralCommissionsEarned()
            ->with('referred:id,name')
            ->latest('earned_at')
            ->paginate(10, ['*'], 'commissions_page')
            ->withQueryString()
            ->through(fn (ReferralCommission $commission): array => [
                'public_id' => $commission->public_id,
                'referred_name' => $commission->referred->name,
                'plan_name' => $commission->plan_name,
                'plan_kind' => $commission->plan_kind,
                'commissionable_amount' => $commission->commissionable_amount,
                'commission_rate' => $commission->commission_rate,
                'commission_amount' => $commission->commission_amount,
                'status' => $commission->status->value,
                'earned_at' => $commission->earned_at,
            ]);

        $payouts = $user->commissionPayouts()
            ->withCount('items')
            ->latest()
            ->paginate(8, ['*'], 'payouts_page')
            ->withQueryString()
            ->through(fn (CommissionPayout $payout): array => [
                'public_id' => $payout->public_id,
                'total_amount' => $payout->total_amount,
                'status' => $payout->status->value,
                'reference' => $payout->reference,
                'items_count' => $payout->items_count,
                'created_at' => $payout->created_at,
                'paid_at' => $payout->paid_at,
            ]);

        return Inertia::render('customer/referral/index', [
            'referral' => [
                'code' => $code->code,
                'url' => route('referral.capture', ['code' => $code->code]),
            ],
            'metrics' => [
                'referred_users' => $user->referralsMade()->count(),
                'earning_users' => $user->referralCommissionsEarned()->whereIn('status', $validStatuses)->distinct()->count('referred_user_id'),
                'month_commission' => $user->referralCommissionsEarned()->whereIn('status', $validStatuses)
                    ->whereBetween('earned_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('commission_amount'),
                'paid_total' => $user->referralCommissionsEarned()->where('status', ReferralCommissionStatus::Paid)->sum('commission_amount'),
            ],
            'payable' => [
                'count' => $user->referralCommissionsEarned()->where('status', ReferralCommissionStatus::Approved)
                    ->whereDoesntHave('payoutItem')->count(),
                'total' => $user->referralCommissionsEarned()->where('status', ReferralCommissionStatus::Approved)
                    ->whereDoesntHave('payoutItem')->sum('commission_amount'),
            ],
            'rates' => Plan::query()->where('is_active', true)->where('referral_commission_rate', '>', 0)
                ->orderBy('kind')->orderBy('monthly_price')->get(['public_id', 'name', 'kind', 'monthly_price', 'referral_commission_rate']),
            'referrals' => $referrals,
            'commissions' => $commissions,
            'payouts' => $payouts,
        ]);
    }

    public function storeWithdrawal(Request $request, CreateCommissionPayout $action): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $commissionIds = $user->referralCommissionsEarned()
            ->where('status', ReferralCommissionStatus::Approved)
            ->whereDoesntHave('payoutItem')
            ->pluck('id')->all();

        if ($commissionIds === []) {
            throw ValidationException::withMessages([
                'withdrawal' => __('No approved commission is currently available for withdrawal.'),
            ]);
        }

        $action->request($user, $commissionIds, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Withdrawal request submitted successfully.')]);

        return back();
    }
}
