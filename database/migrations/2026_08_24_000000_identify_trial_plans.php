<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('is_trial')->default(false)->index()->after('is_default');
        });
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('trial_used_at')->nullable()->after('trial_ends_at');
        });

        DB::table('plans')->where('code', 'starter-default')->update([
            'name' => 'Trial 30 Hari',
            'description' => 'Coba seluruh alur operasional toko selama 30 hari.',
            'monthly_price' => 0,
            'is_trial' => true,
            'is_default' => true,
            'is_active' => true,
        ]);
        DB::table('subscriptions')
            ->whereNotNull('trial_ends_at')
            ->whereNull('trial_used_at')
            ->update(['trial_used_at' => DB::raw('starts_at')]);

        $trialPlanId = DB::table('plans')->where('is_trial', true)->value('id');
        if ($trialPlanId !== null) {
            DB::table('subscriptions')
                ->where('plan_id', $trialPlanId)
                ->orderBy('id')
                ->eachById(function (object $subscription): void {
                    $attributes = [
                        'trial_used_at' => $subscription->trial_used_at ?? $subscription->starts_at,
                        'trial_ends_at' => $subscription->trial_ends_at
                            ?? Carbon::parse($subscription->starts_at)->addDays(30),
                    ];
                    if ($subscription->status === 'active') {
                        $attributes += [
                            'status' => 'trialing',
                            'current_period_start' => null,
                            'current_period_end' => null,
                        ];
                    }

                    DB::table('subscriptions')->where('id', $subscription->id)->update($attributes);
                });
        }
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('trial_used_at');
        });
        Schema::table('plans', function (Blueprint $table) {
            $table->dropIndex(['is_trial']);
            $table->dropColumn('is_trial');
        });
    }
};
