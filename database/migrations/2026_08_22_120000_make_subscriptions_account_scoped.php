<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('max_stores')->default(1)->after('monthly_price');
        });

        DB::table('plans')->where('code', 'starter-default')->update(['max_stores' => 3]);

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('public_id')->constrained()->restrictOnDelete();
        });
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('public_id')->constrained()->restrictOnDelete();
        });

        $ownerIds = DB::table('subscriptions')
            ->join('stores', 'stores.id', '=', 'subscriptions.store_id')
            ->distinct()
            ->orderBy('stores.owner_user_id')
            ->pluck('stores.owner_user_id');

        foreach ($ownerIds as $ownerId) {
            $subscriptionId = DB::table('subscriptions')
                ->join('stores', 'stores.id', '=', 'subscriptions.store_id')
                ->join('plans', 'plans.id', '=', 'subscriptions.plan_id')
                ->where('stores.owner_user_id', $ownerId)
                ->orderByDesc('plans.monthly_price')
                ->orderByDesc('subscriptions.current_period_end')
                ->orderBy('subscriptions.id')
                ->value('subscriptions.id');

            if ($subscriptionId !== null) {
                DB::table('subscriptions')->where('id', $subscriptionId)->update(['user_id' => $ownerId]);
            }
        }

        DB::table('subscription_payments')
            ->join('stores', 'stores.id', '=', 'subscription_payments.store_id')
            ->select(['subscription_payments.id', 'stores.owner_user_id'])
            ->orderBy('subscription_payments.id')
            ->each(function (object $payment): void {
                DB::table('subscription_payments')->where('id', $payment->id)->update([
                    'user_id' => $payment->owner_user_id,
                ]);
            });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->unique('user_id');
        });
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->index(['user_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        $defaultPlanId = DB::table('plans')->where(['is_default' => true, 'is_active' => true])->value('id');

        if ($defaultPlanId !== null) {
            foreach (DB::table('stores')->orderBy('id')->get() as $store) {
                if (DB::table('subscriptions')->where('store_id', $store->id)->exists()) {
                    continue;
                }

                $accountSubscription = DB::table('subscriptions')->where('user_id', $store->owner_user_id)->first();
                DB::table('subscriptions')->insert([
                    'public_id' => (string) Str::ulid(),
                    'store_id' => $store->id,
                    'plan_id' => $accountSubscription?->plan_id ?? $defaultPlanId,
                    'status' => $accountSubscription?->status ?? 'active',
                    'starts_at' => $accountSubscription?->starts_at ?? now(),
                    'trial_ends_at' => $accountSubscription?->trial_ends_at,
                    'current_period_start' => $accountSubscription?->current_period_start,
                    'current_period_end' => $accountSubscription?->current_period_end,
                    'cancelled_at' => $accountSubscription?->cancelled_at,
                    'notes' => $accountSubscription?->notes,
                    'created_by_user_id' => $accountSubscription?->created_by_user_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'paid_at']);
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('max_stores');
        });
    }
};
