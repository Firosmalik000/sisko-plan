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
        Schema::create('subscription_periods', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('subscription_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->string('plan_name', 120);
            $table->decimal('monthly_price', 19, 4);
            $table->unsignedTinyInteger('duration_months')->default(1);
            $table->date('period_start');
            $table->date('period_end')->nullable();
            $table->string('source', 30);
            $table->timestamp('activated_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['user_id', 'period_start']);
            $table->index(['subscription_id', 'period_end']);
            $table->index(['user_id', 'activated_at', 'period_start']);
        });

        DB::table('subscriptions')
            ->join('plans', 'plans.id', '=', 'subscriptions.plan_id')
            ->whereNotNull('subscriptions.user_id')
            ->select([
                'subscriptions.id', 'subscriptions.user_id', 'subscriptions.plan_id',
                'subscriptions.status', 'subscriptions.starts_at', 'subscriptions.trial_ends_at',
                'subscriptions.current_period_start', 'subscriptions.current_period_end',
                'subscriptions.created_by_user_id', 'plans.name as plan_name',
                'plans.monthly_price', 'plans.duration_months',
            ])
            ->orderBy('subscriptions.id')
            ->each(function (object $subscription): void {
                $trial = $subscription->status === 'trialing' && $subscription->trial_ends_at !== null;
                $periodStart = $trial ? $subscription->starts_at : $subscription->current_period_start;
                $periodEnd = $trial ? $subscription->trial_ends_at : $subscription->current_period_end;

                if ($periodStart === null) {
                    return;
                }

                DB::table('subscription_periods')->insert([
                    'public_id' => (string) Str::ulid(),
                    'subscription_id' => $subscription->id,
                    'user_id' => $subscription->user_id,
                    'plan_id' => $subscription->plan_id,
                    'plan_name' => $subscription->plan_name,
                    'monthly_price' => $subscription->monthly_price,
                    'duration_months' => $subscription->duration_months,
                    'period_start' => date('Y-m-d', strtotime($periodStart)),
                    'period_end' => $periodEnd === null ? null : date('Y-m-d', strtotime($periodEnd)),
                    'source' => 'migration',
                    'activated_at' => $periodStart,
                    'created_by_user_id' => $subscription->created_by_user_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_periods');
    }
};
