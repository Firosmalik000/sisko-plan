<?php

namespace App\Http\Controllers\Customer;

use App\Actions\Subscriptions\PurchaseSubscriptionAddon;
use App\Actions\Subscriptions\SelectSubscriptionPlan;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SelectSubscriptionPlanController extends Controller
{
    public function __invoke(Request $request, SelectSubscriptionPlan $action, PurchaseSubscriptionAddon $addons): RedirectResponse
    {
        $membership = AuthenticatedUser::get($request)->businessMemberships()
            ->where('business_role', 'owner')->where('status', 'active')
            ->when($request->session()->has('active_business_id'), fn ($query) => $query->where('business_id', $request->session()->get('active_business_id')))
            ->first();
        abort_unless($membership !== null, 403);

        $validated = $request->validate([
            'plan_id' => ['required', 'string', 'exists:plans,public_id'],
        ]);
        $plan = Plan::query()
            ->where('public_id', $validated['plan_id'])
            ->where('is_active', true)
            ->where('is_default', false)
            ->first();

        if ($plan === null) {
            throw ValidationException::withMessages(['plan_id' => __('Plan is unavailable.')]);
        }

        if ($plan->kind === Plan::KIND_ADDON) {
            $addons->handle($membership, $plan, $request->ip());
            Inertia::flash('toast', ['type' => 'success', 'message' => __('The :name add-on was added successfully.', ['name' => $plan->name])]);

            return to_route('subscription.index');
        }

        $result = $action->handle($membership, $plan, $request->ip());

        if ($result['scheduled']) {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => __('Plan :name is scheduled to start on :date.', [
                    'name' => $plan->name,
                    'date' => $result['period']->period_start->translatedFormat('d M Y'),
                ]),
            ]);

            return to_route('subscription.index');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Plan :name activated successfully.', ['name' => $plan->name])]);

        return to_route('dashboard');
    }
}
