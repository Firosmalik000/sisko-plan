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
        Schema::table('plans', function (Blueprint $table): void {
            $table->decimal('referral_commission_rate', 5, 2)->default(0)->after('monthly_price');
        });

        Schema::table('subscription_payments', function (Blueprint $table): void {
            $table->foreignId('plan_id')->nullable()->after('subscription_id')->constrained()->restrictOnDelete();
            $table->string('plan_name', 120)->nullable()->after('plan_id');
            $table->string('plan_kind', 20)->nullable()->after('plan_name');
            $table->index(['plan_id', 'paid_at']);
        });

        Schema::create('referral_codes', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('code', 16)->unique();
            $table->timestamps();
        });

        Schema::create('referral_attributions', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('referrer_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('referred_user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->foreignId('referral_code_id')->constrained()->restrictOnDelete();
            $table->timestamp('attributed_at');
            $table->timestamps();
            $table->index(['referrer_user_id', 'attributed_at']);
        });

        Schema::create('referral_commissions', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('referrer_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('referred_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('referral_attribution_id')->constrained()->restrictOnDelete();
            $table->foreignId('subscription_payment_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->string('plan_name', 120);
            $table->string('plan_kind', 20);
            $table->string('payment_receipt_number', 30);
            $table->decimal('commissionable_amount', 19, 4);
            $table->decimal('commission_rate', 5, 2);
            $table->decimal('commission_amount', 19, 4);
            $table->string('status', 20)->default('pending');
            $table->timestamp('earned_at');
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('reversed_at')->nullable();
            $table->string('reversal_reason', 500)->nullable();
            $table->timestamps();
            $table->index(['referrer_user_id', 'status', 'earned_at']);
            $table->index(['referred_user_id', 'earned_at']);
            $table->index(['plan_id', 'earned_at']);
            $table->index(['status', 'earned_at']);
        });

        Schema::create('commission_payouts', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('referrer_user_id')->constrained('users')->restrictOnDelete();
            $table->decimal('total_amount', 19, 4);
            $table->string('status', 20)->default('pending');
            $table->string('reference', 120)->nullable();
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('paid_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['referrer_user_id', 'status', 'created_at']);
        });

        Schema::create('commission_payout_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('commission_payout_id')->constrained()->restrictOnDelete();
            $table->foreignId('referral_commission_id')->unique()->constrained()->restrictOnDelete();
            $table->decimal('amount', 19, 4);
            $table->timestamp('created_at')->useCurrent();
        });

        DB::table('users')->orderBy('id')->eachById(function (object $user): void {
            if (DB::table('referral_codes')->where('user_id', $user->id)->exists()) {
                return;
            }

            do {
                $code = Str::upper(Str::random(10));
            } while (DB::table('referral_codes')->where('code', $code)->exists());

            DB::table('referral_codes')->insert([
                'public_id' => (string) Str::ulid(),
                'user_id' => $user->id,
                'code' => $code,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_payout_items');
        Schema::dropIfExists('commission_payouts');
        Schema::dropIfExists('referral_commissions');
        Schema::dropIfExists('referral_attributions');
        Schema::dropIfExists('referral_codes');

        Schema::table('subscription_payments', function (Blueprint $table): void {
            $table->dropIndex(['plan_id', 'paid_at']);
            $table->dropConstrainedForeignId('plan_id');
            $table->dropColumn(['plan_name', 'plan_kind']);
        });
        Schema::table('plans', fn (Blueprint $table) => $table->dropColumn('referral_commission_rate'));
    }
};
