<?php

namespace App\Http\Controllers\Customer;

use App\Actions\Subscriptions\CompleteSubscriptionOrder;
use App\Actions\Subscriptions\CreateSubscriptionOrder;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SelectSubscriptionPlanController extends Controller
{
    public function __invoke(Request $request, CreateSubscriptionOrder $orders, CompleteSubscriptionOrder $complete): RedirectResponse
    {
        $user = $request->user();

        if (! $user instanceof User || $user->isPlatformAdmin()) {
            abort(403);
        }

        abort_unless($user->ownedStores()->exists(), 403);

        $validated = $request->validate([
            'plan_id' => ['required', 'string', 'exists:plans,public_id'],
            'idempotency_key' => ['nullable', 'uuid'],
        ]);
        $plan = Plan::query()
            ->where('public_id', $validated['plan_id'])
            ->where('is_active', true)
            ->where('is_default', false)
            ->first();

        if ($plan === null) {
            throw ValidationException::withMessages(['plan_id' => __('Plan is unavailable.')]);
        }

        $order = $orders->handle($user, $plan, $validated['idempotency_key'] ?? (string) Str::uuid());
        $order = $complete->handle($order, $request->ip());

        if ($order->plan_kind === Plan::KIND_ADDON) {
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Add-on :name berhasil ditambahkan.', ['name' => $plan->name])]);

            return to_route('subscription.index');
        }

        if ($order->period?->activated_at === null) {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => __('Plan :name is scheduled to start on :date.', [
                    'name' => $plan->name,
                    'date' => $order->period->period_start->translatedFormat('d M Y'),
                ]),
            ]);

            return to_route('subscription.index');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Plan :name activated successfully.', ['name' => $plan->name])]);

        return to_route('dashboard');
    }
}
