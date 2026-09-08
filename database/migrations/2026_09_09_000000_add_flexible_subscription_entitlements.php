<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table): void {
            $table->string('kind', 20)->default('base')->index()->after('description');
            $table->string('billing_cycle', 20)->default('fixed')->index()->after('monthly_price');
            $table->unsignedInteger('max_scans')->default(0)->after('max_members');
        });
        Schema::table('subscription_periods', function (Blueprint $table): void {
            $table->boolean('was_trial')->default(false)->after('duration_months');
        });

        Schema::create('subscription_addons', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('subscription_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->string('plan_name', 120);
            $table->decimal('price', 19, 4);
            $table->unsignedTinyInteger('duration_months')->default(1);
            $table->unsignedInteger('stores')->default(0);
            $table->unsignedInteger('products')->default(0);
            $table->unsignedInteger('members')->default(0);
            $table->unsignedInteger('scans')->default(0);
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->string('source', 30);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['user_id', 'starts_on', 'ends_on']);
            $table->index(['subscription_id', 'plan_id']);
        });

        Schema::create('subscription_scan_usages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedInteger('used')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'period_start']);
        });

        Schema::create('subscription_scan_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('usage_id')->constrained('subscription_scan_usages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->string('request_key', 64);
            $table->string('operation', 30);
            $table->unsignedInteger('units');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['user_id', 'request_key']);
            $table->index(['store_id', 'created_at']);
        });

        $planId = DB::table('plans')->where('code', 'starter-default')->value('id');
        if ($planId === null) {
            return;
        }

        DB::table('subscription_periods')->where('plan_id', $planId)->update(['was_trial' => true]);
        DB::table('subscription_periods')
            ->where('plan_id', $planId)
            ->whereNull('period_end')
            ->update(['was_trial' => false]);

        DB::table('plans')->where('id', $planId)->update([
            'name' => 'Gratis Selamanya',
            'description' => 'Paket dasar untuk memulai operasional toko.',
            'kind' => 'base',
            'billing_cycle' => 'lifetime',
            'monthly_price' => 0,
            'duration_months' => 1,
            'max_stores' => 1,
            'max_members' => 1,
            'max_scans' => 100,
            'is_default' => true,
            'is_trial' => false,
            'is_active' => true,
            'updated_at' => now(),
        ]);
        DB::table('plans')->where('id', '!=', $planId)->where('is_trial', true)->update([
            'is_trial' => false,
            'is_active' => false,
            'updated_at' => now(),
        ]);

        DB::table('subscriptions')
            ->where('plan_id', $planId)
            ->whereIn('status', ['trialing', 'active'])
            ->orderBy('id')->eachById(
                function (object $subscription): void {
                    $start = Carbon::parse($subscription->starts_at)->toDateString();
                    DB::table('subscriptions')->where('id', $subscription->id)->update([
                        'status' => 'active',
                        'trial_ends_at' => null,
                        'current_period_start' => $start,
                        'current_period_end' => null,
                        'cancelled_at' => null,
                        'updated_at' => now(),
                    ]);
                    $exists = DB::table('subscription_periods')
                        ->where('subscription_id', $subscription->id)
                        ->where('plan_id', $subscription->plan_id)
                        ->where('period_start', $start)
                        ->whereNull('period_end')
                        ->exists();
                    if (! $exists) {
                        DB::table('subscription_periods')->insert([
                            'public_id' => (string) Str::ulid(),
                            'subscription_id' => $subscription->id,
                            'user_id' => $subscription->user_id,
                            'plan_id' => $subscription->plan_id,
                            'plan_name' => 'Gratis Selamanya',
                            'monthly_price' => 0,
                            'duration_months' => 1,
                            'was_trial' => false,
                            'period_start' => $start,
                            'period_end' => null,
                            'source' => 'free_plan_migration',
                            'activated_at' => now(),
                            'created_by_user_id' => null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                },
            );
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_scan_events');
        Schema::dropIfExists('subscription_scan_usages');
        Schema::dropIfExists('subscription_addons');

        Schema::table('subscription_periods', function (Blueprint $table): void {
            $table->dropColumn('was_trial');
        });

        $planId = DB::table('plans')->where('code', 'starter-default')->value('id');
        if ($planId !== null) {
            DB::table('subscription_periods')->where('source', 'free_plan_migration')->delete();
            DB::table('plans')->where('id', $planId)->update([
                'name' => 'Trial 30 Hari',
                'description' => 'Coba seluruh alur operasional toko selama 30 hari.',
                'monthly_price' => 0,
                'is_default' => true,
                'is_trial' => true,
                'is_active' => true,
                'updated_at' => now(),
            ]);
            DB::table('subscriptions')
                ->where('plan_id', $planId)
                ->where('status', 'active')
                ->orderBy('id')->eachById(
                    function (object $subscription): void {
                        $start = Carbon::parse($subscription->starts_at);
                        DB::table('subscriptions')->where('id', $subscription->id)->update([
                            'status' => 'trialing',
                            'trial_ends_at' => $start->copy()->addDays(30),
                            'current_period_start' => null,
                            'current_period_end' => null,
                            'updated_at' => now(),
                        ]);
                    },
                );
        }

        Schema::table('plans', function (Blueprint $table): void {
            $table->dropIndex(['kind']);
            $table->dropIndex(['billing_cycle']);
            $table->dropColumn(['kind', 'billing_cycle', 'max_scans']);
        });
    }
};
