<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\CurrentStore;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function __invoke(CurrentStore $currentStore, SubscriptionAccess $access): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewSubscription', $store);
        $subscription = Subscription::query()->with('plan')->where('store_id', $store->id)->firstOrFail();
        $payments = SubscriptionPayment::query()->where('store_id', $store->id)->latest('id')->paginate(20, ['public_id', 'receipt_number', 'amount', 'period_start', 'period_end', 'payment_method', 'external_reference', 'paid_at']);

        return Inertia::render('subscription/index', [
            'subscription' => [
                ...$subscription->only(['public_id', 'status', 'starts_at', 'trial_ends_at', 'current_period_start', 'current_period_end']),
                'status' => $subscription->status->value,
                'plan' => $subscription->plan->only(['name', 'description', 'monthly_price', 'max_products', 'max_members']),
            ],
            'usage' => $access->summary($store),
            'payments' => $payments,
        ]);
    }
}
