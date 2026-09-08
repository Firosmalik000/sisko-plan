<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $today = Carbon::now('Asia/Jakarta')->startOfDay();
        $freePlanId = DB::table('plans')->where('code', 'starter-default')->value('id');

        if ($freePlanId === null) {
            throw new RuntimeException('The starter-default plan must exist before account subscriptions are backfilled.');
        }

        DB::table('plans')->where('id', $freePlanId)->update([
            'name' => 'Gratis Selamanya',
            'description' => 'Paket dasar untuk memulai operasional toko.',
            'kind' => 'base',
            'billing_cycle' => 'lifetime',
            'monthly_price' => 0,
            'duration_months' => 1,
            'max_stores' => 1,
            'max_products' => 1000,
            'max_members' => 1,
            'max_scans' => 100,
            'is_default' => true,
            'is_trial' => false,
            'is_active' => true,
            'updated_at' => $now,
        ]);
        DB::table('plans')
            ->where('id', '!=', $freePlanId)
            ->where('kind', 'base')
            ->update(['is_default' => false, 'is_trial' => false, 'is_active' => false, 'updated_at' => $now]);

        DB::table('users')
            ->whereNull('platform_role')
            ->where(function ($accounts): void {
                $accounts->whereExists(function ($stores): void {
                    $stores->selectRaw('1')->from('stores')
                        ->whereColumn('stores.owner_user_id', 'users.id');
                })->orWhereNotExists(function ($memberships): void {
                    $memberships->selectRaw('1')->from('store_memberships')
                        ->whereColumn('store_memberships.user_id', 'users.id');
                });
            })
            ->orderBy('id')
            ->eachById(function (object $user) use ($freePlanId, $now, $today): void {
                DB::transaction(function () use ($user, $freePlanId, $now, $today): void {
                    $subscription = DB::table('subscriptions')->where('user_id', $user->id)->lockForUpdate()->first();
                    $storeId = DB::table('stores')->where('owner_user_id', $user->id)->oldest('id')->value('id');

                    if ($subscription === null) {
                        $subscriptionId = DB::table('subscriptions')->insertGetId([
                            'public_id' => (string) Str::ulid(),
                            'user_id' => $user->id,
                            'store_id' => $storeId,
                            'plan_id' => $freePlanId,
                            'status' => 'active',
                            'starts_at' => $now,
                            'trial_ends_at' => null,
                            'trial_used_at' => null,
                            'current_period_start' => $today->toDateString(),
                            'current_period_end' => null,
                            'cancelled_at' => null,
                            'notes' => null,
                            'created_by_user_id' => null,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    } else {
                        $subscriptionId = $subscription->id;
                        $openFreePeriodStart = DB::table('subscription_periods')
                            ->where('subscription_id', $subscriptionId)
                            ->where('plan_id', $freePlanId)
                            ->whereNull('period_end')
                            ->value('period_start');
                        $currentStart = (int) $subscription->plan_id === (int) $freePlanId && $openFreePeriodStart !== null
                            ? Carbon::parse($openFreePeriodStart)->toDateString()
                            : $today->toDateString();
                        DB::table('subscription_periods')
                            ->where('subscription_id', $subscriptionId)
                            ->where('plan_id', '!=', $freePlanId)
                            ->whereNull('activated_at')
                            ->delete();

                        DB::table('subscription_periods')
                            ->where('subscription_id', $subscriptionId)
                            ->where('plan_id', '!=', $freePlanId)
                            ->whereNull('period_end')
                            ->orderBy('id')
                            ->eachById(function (object $period) use ($today, $now): void {
                                $start = Carbon::parse($period->period_start)->startOfDay();
                                $end = $start->gte($today) ? $start : $today->copy()->subDay();
                                DB::table('subscription_periods')->where('id', $period->id)->update([
                                    'period_end' => $end->toDateString(),
                                    'updated_at' => $now,
                                ]);
                            });

                        $restricted = in_array($subscription->status, ['suspended', 'cancelled'], true);
                        DB::table('subscriptions')->where('id', $subscriptionId)->update([
                            'store_id' => $subscription->store_id ?? $storeId,
                            'plan_id' => $freePlanId,
                            'status' => $restricted ? $subscription->status : 'active',
                            'trial_ends_at' => null,
                            'current_period_start' => $currentStart,
                            'current_period_end' => null,
                            'cancelled_at' => $restricted ? $subscription->cancelled_at : null,
                            'updated_at' => $now,
                        ]);
                    }

                    $hasOpenFreePeriod = DB::table('subscription_periods')
                        ->where('subscription_id', $subscriptionId)
                        ->where('plan_id', $freePlanId)
                        ->whereNull('period_end')
                        ->exists();

                    if (! $hasOpenFreePeriod) {
                        DB::table('subscription_periods')->insert([
                            'public_id' => (string) Str::ulid(),
                            'subscription_id' => $subscriptionId,
                            'user_id' => $user->id,
                            'plan_id' => $freePlanId,
                            'plan_name' => 'Gratis Selamanya',
                            'monthly_price' => 0,
                            'duration_months' => 1,
                            'was_trial' => false,
                            'period_start' => $today->toDateString(),
                            'period_end' => null,
                            'source' => 'account_free_backfill',
                            'activated_at' => $now,
                            'created_by_user_id' => null,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                }, 3);
            });

        foreach ($this->addonOffers() as $offer) {
            if (! DB::table('plans')->where('code', $offer['code'])->exists()) {
                DB::table('plans')->insert([
                    'public_id' => (string) Str::ulid(),
                    ...$offer,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        DB::table('plans')
            ->where('id', '!=', $freePlanId)
            ->where('kind', 'base')
            ->pluck('id')
            ->each(function (int $planId): void {
                $used = DB::table('subscriptions')->where('plan_id', $planId)->exists()
                    || DB::table('subscription_periods')->where('plan_id', $planId)->exists()
                    || DB::table('subscription_addons')->where('plan_id', $planId)->exists();

                if (! $used) {
                    DB::table('plans')->where('id', $planId)->delete();
                }
            });
    }

    public function down(): void
    {
        throw new RuntimeException('Previous subscription assignments and cancelled queued periods cannot be reconstructed safely.');
    }

    /** @return array<int, array<string, int|string|bool|null>> */
    private function addonOffers(): array
    {
        return [
            [
                'code' => 'addon-store-1', 'name' => 'Tambah 1 Toko',
                'description' => 'Tambahan kapasitas satu toko selama satu bulan.',
                'kind' => 'addon', 'billing_cycle' => 'fixed', 'monthly_price' => 0,
                'duration_months' => 1, 'max_stores' => 1, 'max_products' => 0,
                'max_members' => 0, 'max_scans' => 0, 'is_default' => false,
                'is_trial' => false, 'is_active' => false,
            ],
            [
                'code' => 'addon-staff-1', 'name' => 'Tambah 1 Staf',
                'description' => 'Tambahan kapasitas satu staf selama satu bulan.',
                'kind' => 'addon', 'billing_cycle' => 'fixed', 'monthly_price' => 0,
                'duration_months' => 1, 'max_stores' => 0, 'max_products' => 0,
                'max_members' => 1, 'max_scans' => 0, 'is_default' => false,
                'is_trial' => false, 'is_active' => false,
            ],
            [
                'code' => 'addon-scan-100', 'name' => 'Tambah 100 Scan',
                'description' => 'Tambahan kuota 100 scan selama satu bulan.',
                'kind' => 'addon', 'billing_cycle' => 'fixed', 'monthly_price' => 0,
                'duration_months' => 1, 'max_stores' => 0, 'max_products' => 0,
                'max_members' => 0, 'max_scans' => 100, 'is_default' => false,
                'is_trial' => false, 'is_active' => false,
            ],
        ];
    }
};
