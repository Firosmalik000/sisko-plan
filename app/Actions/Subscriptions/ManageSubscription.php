<?php

namespace App\Actions\Subscriptions;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionAddon;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ManageSubscription
{
    public function __construct(private RecordAdminAudit $audit) {}

    /** @param array{plan_id:int,status:SubscriptionStatus,starts_at:string,trial_ends_at:?string,current_period_start:?string,current_period_end:?string,notes:?string,addons:?list<array{id:?int,plan_id:int,starts_on:string,ends_on:?string}>} $data */
    public function handle(User $admin, Subscription $subscription, array $data, ?string $ipAddress): Subscription
    {
        return DB::transaction(function () use ($admin, $subscription, $data, $ipAddress): Subscription {
            $subscription = Subscription::query()->whereKey($subscription->id)->lockForUpdate()->firstOrFail();
            Plan::query()
                ->whereKey($data['plan_id'])
                ->where(fn ($query) => $query->where('is_active', true)->orWhere('id', $subscription->plan_id))
                ->firstOrFail();
            $assignedAddons = SubscriptionAddon::query()
                ->where('subscription_id', $subscription->id)
                ->where(fn ($query) => $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', now()->toDateString()))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $before = $subscription->only(['plan_id', 'status', 'starts_at', 'trial_ends_at', 'trial_used_at', 'current_period_start', 'current_period_end', 'cancelled_at', 'notes']);
            $beforeAddons = $assignedAddons->map(fn (SubscriptionAddon $addon): array => $this->addonSnapshot($addon))->values()->all();
            $subscription->update([
                ...collect($data)->except('addons')->all(),
                'trial_used_at' => $data['status'] === SubscriptionStatus::Trialing
                    ? ($subscription->trial_used_at ?? now())
                    : $subscription->trial_used_at,
                'cancelled_at' => $data['status'] === SubscriptionStatus::Cancelled ? now() : null,
                'created_by_user_id' => $admin->id,
            ]);
            if (($data['addons'] ?? null) !== null) {
                $keptIds = [];
                foreach ($data['addons'] as $addonData) {
                    $currentAddon = $addonData['id'] !== null ? $assignedAddons->get($addonData['id']) : null;
                    abort_if($addonData['id'] !== null && ! $currentAddon instanceof SubscriptionAddon, 404);
                    $plan = Plan::query()
                        ->whereKey($addonData['plan_id'])
                        ->where('kind', Plan::KIND_ADDON)
                        ->where(fn ($query) => $query
                            ->where('is_active', true)
                            ->when($currentAddon !== null, fn ($plans) => $plans->orWhereKey($currentAddon->plan_id)))
                        ->lockForUpdate()
                        ->firstOrFail();
                    $attributes = [
                        'user_id' => $subscription->user_id,
                        'plan_id' => $plan->id,
                        'plan_name' => $plan->name,
                        'offer_category' => $plan->offer_category,
                        'price' => $plan->monthly_price,
                        'duration_months' => $plan->duration_months,
                        'stores' => $plan->max_stores,
                        'products' => $plan->max_products,
                        'members' => $plan->max_members,
                        'scans' => $plan->max_scans,
                        'starts_on' => $addonData['starts_on'],
                        'ends_on' => $addonData['ends_on'],
                        'source' => 'admin',
                        'created_by_user_id' => $admin->id,
                    ];
                    if ($addonData['id'] !== null) {
                        assert($currentAddon instanceof SubscriptionAddon);
                        $addon = $currentAddon;
                        $addon->update($attributes);
                    } else {
                        $addon = $subscription->addons()->create($attributes);
                    }
                    $keptIds[] = $addon->id;
                }
                $assignedAddons->except($keptIds)->each->delete();
            }
            $afterAddons = $subscription->addons()
                ->where(fn ($query) => $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', now()->toDateString()))
                ->orderBy('id')
                ->get()
                ->map(fn (SubscriptionAddon $addon): array => $this->addonSnapshot($addon))
                ->all();
            $this->audit->handle($admin, 'subscription.updated', $subscription, $ipAddress, [
                'user_id' => $subscription->user_id,
                'before' => $before,
                'after' => $subscription->only(['plan_id', 'status', 'starts_at', 'trial_ends_at', 'trial_used_at', 'current_period_start', 'current_period_end', 'cancelled_at', 'notes']),
                'addons_before' => $beforeAddons,
                'addons_after' => $afterAddons,
            ]);

            return $subscription;
        }, 3);
    }

    /** @return array<string, mixed> */
    private function addonSnapshot(SubscriptionAddon $addon): array
    {
        return [
            ...$addon->only(['public_id', 'plan_id', 'plan_name', 'offer_category', 'price', 'duration_months', 'stores', 'products', 'members', 'scans', 'source']),
            'starts_on' => $addon->starts_on->toDateString(),
            'ends_on' => $addon->ends_on?->toDateString(),
        ];
    }
}
