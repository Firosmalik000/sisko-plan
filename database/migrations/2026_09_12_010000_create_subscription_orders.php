<?php

use App\Actions\Subscriptions\BackfillSelfServiceSubscriptionOrders;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_orders', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('subscription_id')->constrained()->restrictOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->foreignId('subscription_period_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->foreignId('subscription_addon_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->foreignId('subscription_payment_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->string('plan_name', 120);
            $table->string('plan_kind', 20);
            $table->decimal('amount', 19, 4);
            $table->decimal('referral_commission_rate', 5, 2)->default(0);
            $table->json('plan_snapshot');
            $table->string('status', 20)->default('pending');
            $table->string('provider', 40)->default('manual');
            $table->string('provider_reference', 160)->nullable();
            $table->string('idempotency_key', 64)->unique();
            $table->char('request_hash', 64);
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['user_id', 'status', 'created_at']);
            $table->index(['provider', 'provider_reference']);
            $table->index(['status', 'created_at']);
        });

        app(BackfillSelfServiceSubscriptionOrders::class)->handle();
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_orders');
    }
};
