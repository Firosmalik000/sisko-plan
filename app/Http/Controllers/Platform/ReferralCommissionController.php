<?php

namespace App\Http\Controllers\Platform;

use App\Actions\Referrals\CreateCommissionPayout;
use App\Actions\Referrals\MarkCommissionPayoutPaid;
use App\Actions\Referrals\TransitionReferralCommission;
use App\Enums\ReferralCommissionStatus;
use App\Http\Controllers\Controller;
use App\Models\CommissionPayout;
use App\Models\ReferralAttribution;
use App\Models\ReferralCommission;
use App\Models\User;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\DecimalAmount;
use App\Support\PlatformPermission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReferralCommissionController extends Controller
{
    public function overview(Request $request): Response
    {
        $month = [now()->startOfMonth(), now()->endOfMonth()];

        return $this->render($request, 'overview', [
            'metrics' => [
                'relationships' => ReferralAttribution::query()->count(),
                'active_referrers' => ReferralAttribution::query()->distinct()->count('referrer_user_id'),
                'this_month' => ReferralCommission::query()->whereBetween('earned_at', $month)->sum('commission_amount'),
                'pending' => ReferralCommission::query()->where('status', ReferralCommissionStatus::Pending)->sum('commission_amount'),
                'approved' => ReferralCommission::query()->where('status', ReferralCommissionStatus::Approved)->sum('commission_amount'),
                'paid' => ReferralCommission::query()->where('status', ReferralCommissionStatus::Paid)->sum('commission_amount'),
            ],
            'recent_commissions' => $this->commissionQuery()->latest('earned_at')->limit(8)->get()->map(fn (ReferralCommission $commission) => $this->commissionPayload($commission)),
            'top_referrers' => User::query()->whereHas('referralCommissionsEarned')
                ->withSum('referralCommissionsEarned as commission_total', 'commission_amount')
                ->withCount('referralsMade')->orderByDesc('commission_total')->limit(5)->get(['id', 'name', 'email'])
                ->map(fn (User $user) => ['name' => $user->name, 'email' => $user->email, 'referrals_count' => $user->referrals_made_count, 'commission_total' => $user->commission_total]),
        ]);
    }

    public function referrals(Request $request): Response
    {
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:120'], 'referrer' => ['nullable', 'string', 'size:26']]);
        $search = trim((string) ($filters['search'] ?? ''));
        $referrers = User::query()->whereHas('referralsMade')->with('referralCode:id,user_id,code')
            ->withCount('referralsMade')->withSum('referralCommissionsEarned as commission_total', 'commission_amount')
            ->withSum('referralCommissionsEarned as referral_revenue', 'commissionable_amount')
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhereHas('referralCode', fn ($code) => $code->where('code', 'like', "%{$search}%"))))
            ->latest('id')->paginate(20)->withQueryString()->through(fn (User $user) => [
                'public_id' => $user->referralCode?->public_id, 'name' => $user->name, 'email' => $user->email,
                'code' => $user->referralCode?->code, 'referrals_count' => $user->referrals_made_count,
                'referral_revenue' => $user->referral_revenue ?? '0', 'commission_total' => $user->commission_total ?? '0',
            ]);

        $selected = null;
        if (! empty($filters['referrer'])) {
            $user = User::query()->whereHas('referralCode', fn ($query) => $query->where('public_id', $filters['referrer']))->firstOrFail();
            $selected = [
                'name' => $user->name,
                'users' => ReferralAttribution::query()->where('referrer_user_id', $user->id)
                    ->with(['referred:id,name,email', 'referred.subscription.plan:id,name'])
                    ->withSum('commissions as revenue', 'commissionable_amount')->withSum('commissions as commission_total', 'commission_amount')
                    ->latest('attributed_at')->limit(100)->get()->map(fn (ReferralAttribution $item) => [
                        'name' => $item->referred->name, 'email' => $item->referred->email,
                        'attributed_at' => $item->attributed_at, 'plan' => $item->referred->subscription?->plan?->name,
                        'revenue' => $item->revenue ?? '0', 'commission_total' => $item->commission_total ?? '0',
                    ]),
            ];
        }

        return $this->render($request, 'referrals', ['referrers' => $referrers, 'selected_referrer' => $selected, 'filters' => ['search' => $search]]);
    }

    public function commissions(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'], 'status' => ['nullable', Rule::enum(ReferralCommissionStatus::class)],
            'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'], 'kind' => ['nullable', Rule::in(['base', 'addon'])],
        ]);
        $query = $this->commissionQuery()
            ->when(filled($filters['search'] ?? null), function ($query) use ($filters): void {
                $search = trim($filters['search']);
                $query->where(fn ($query) => $query->where('payment_receipt_number', 'like', "%{$search}%")->orWhere('plan_name', 'like', "%{$search}%")
                    ->orWhereHas('referrer', fn ($user) => $user->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('referred', fn ($user) => $user->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")));
            })->when(filled($filters['status'] ?? null), fn ($query) => $query->where('status', $filters['status']))
            ->when(filled($filters['from'] ?? null), fn ($query) => $query->whereDate('earned_at', '>=', $filters['from']))
            ->when(filled($filters['to'] ?? null), fn ($query) => $query->whereDate('earned_at', '<=', $filters['to']))
            ->when(filled($filters['kind'] ?? null), fn ($query) => $query->where('plan_kind', $filters['kind']));

        return $this->render($request, 'commissions', [
            'commission_total' => (clone $query)->sum('commission_amount'),
            'commissions' => $query->latest('earned_at')->paginate(20)->withQueryString()->through(fn (ReferralCommission $commission) => $this->commissionPayload($commission)),
            'filters' => $filters,
        ]);
    }

    public function payouts(Request $request): Response
    {
        $payable = User::query()->whereHas('referralCommissionsEarned', fn ($query) => $query->where('status', ReferralCommissionStatus::Approved)->whereDoesntHave('payoutItem'))
            ->with(['referralCode:id,user_id,public_id', 'referralCommissionsEarned' => fn ($query) => $query->where('status', ReferralCommissionStatus::Approved)->whereDoesntHave('payoutItem')->with(['referrer:id,name,email', 'referred:id,name,email'])->orderBy('earned_at')])
            ->get(['id', 'name', 'email'])->map(fn (User $user) => [
                'referrer_id' => $user->referralCode->public_id, 'name' => $user->name, 'email' => $user->email,
                'total' => DecimalAmount::sum($user->referralCommissionsEarned->pluck('commission_amount')->all()),
                'commissions' => $user->referralCommissionsEarned->map(fn (ReferralCommission $item) => $this->commissionPayload($item))->all(),
            ]);
        $history = CommissionPayout::query()->with(['referrer:id,name,email', 'creator:id,name', 'paidBy:id,name', 'items.commission'])
            ->latest()->paginate(20)->withQueryString()->through(function (CommissionPayout $payout): array {
                $items = [];
                foreach ($payout->items as $item) {
                    $items[] = ['amount' => $item->amount, 'commission' => $this->commissionPayload($item->commission)];
                }

                return [
                    ...$payout->only(['public_id', 'total_amount', 'reference', 'notes', 'created_at', 'paid_at']),
                    'status' => $payout->status->value, 'referrer' => $payout->referrer->only(['name', 'email']),
                    'created_by' => $payout->creator->name, 'paid_by' => $payout->paidBy?->name,
                    'items' => $items,
                ];
            });

        return $this->render($request, 'payouts', ['payable' => $payable, 'payouts' => $history]);
    }

    public function updateCommission(Request $request, ReferralCommission $commission, TransitionReferralCommission $action): RedirectResponse
    {
        $validated = $request->validate(['status' => ['required', Rule::in(['approved', 'reversed'])], 'reason' => [Rule::requiredIf($request->input('status') === 'reversed'), 'nullable', 'string', 'max:500']]);
        $action->handle(AuthenticatedPlatformAdmin::get($request), $commission, ReferralCommissionStatus::from($validated['status']), $validated['reason'] ?? null, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Commission updated successfully.')]);

        return back();
    }

    public function storePayout(Request $request, CreateCommissionPayout $action): RedirectResponse
    {
        $validated = $request->validate(['referrer_id' => ['required', 'string', 'size:26', Rule::exists('referral_codes', 'public_id')], 'commissions' => ['required', 'array', 'min:1', 'max:200'], 'commissions.*' => ['required', 'string', 'size:26', 'distinct', Rule::exists('referral_commissions', 'public_id')], 'reference' => ['nullable', 'string', 'max:120'], 'notes' => ['nullable', 'string', 'max:500']]);
        $referrer = User::query()->whereHas('referralCode', fn ($query) => $query->where('public_id', $validated['referrer_id']))->firstOrFail();
        $ids = ReferralCommission::query()->whereIn('public_id', $validated['commissions'])->get(['id'])
            ->map(fn (ReferralCommission $commission): int => $commission->id)->values()->all();
        $action->handle(AuthenticatedPlatformAdmin::get($request), $referrer, $ids, $validated['reference'] ?? null, $validated['notes'] ?? null, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payout created successfully.')]);

        return back();
    }

    public function payPayout(Request $request, CommissionPayout $payout, MarkCommissionPayoutPaid $action): RedirectResponse
    {
        $validated = $request->validate(['reference' => ['nullable', 'string', 'max:120'], 'notes' => ['nullable', 'string', 'max:500']]);
        $action->handle(AuthenticatedPlatformAdmin::get($request), $payout, $validated['reference'] ?? null, $validated['notes'] ?? null, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payout marked as paid.')]);

        return back();
    }

    /** @param array<string, mixed> $props */
    private function render(Request $request, string $tab, array $props): Response
    {
        $admin = AuthenticatedPlatformAdmin::get($request);

        return Inertia::render('platform/referral-commission/index', [...$props, 'tab' => $tab, 'access' => [
            'view_referrals' => $admin->can(PlatformPermission::REFERRALS_VIEW),
            'view_commissions' => $admin->can(PlatformPermission::COMMISSIONS_VIEW),
            'view_payouts' => $admin->can(PlatformPermission::PAYOUTS_VIEW),
            'manage_commissions' => $admin->can(PlatformPermission::COMMISSIONS_MANAGE),
            'manage_payouts' => $admin->can(PlatformPermission::PAYOUTS_MANAGE),
        ]]);
    }

    /** @return Builder<ReferralCommission> */
    private function commissionQuery(): Builder
    {
        return ReferralCommission::query()->with(['referrer:id,name,email', 'referred:id,name,email']);
    }

    /** @return array<string, mixed> */
    private function commissionPayload(ReferralCommission $commission): array
    {
        return [...$commission->only(['public_id', 'plan_name', 'plan_kind', 'payment_receipt_number', 'commissionable_amount', 'commission_rate', 'commission_amount', 'earned_at', 'approved_at', 'paid_at', 'reversed_at', 'reversal_reason']), 'status' => $commission->status->value, 'referrer' => $commission->referrer->only(['name', 'email']), 'referred' => $commission->referred->only(['name', 'email'])];
    }
}
