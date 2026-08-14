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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->string('code', 50)->unique();
            $table->string('name', 120);
            $table->string('description', 500)->nullable();
            $table->decimal('monthly_price', 19, 4)->default(0);
            $table->unsignedInteger('max_products')->default(0);
            $table->unsignedInteger('max_members')->default(0);
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->index();
            $table->timestamp('starts_at');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_platform_admin_id')->nullable()->constrained('platform_admins')->restrictOnDelete();
            $table->timestamps();
            $table->index(['status', 'current_period_end']);
            $table->index(['plan_id', 'status']);
        });

        Schema::create('platform_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('document_type', 30);
            $table->char('period', 6);
            $table->unsignedBigInteger('last_number')->default(0);
            $table->timestamps();
            $table->unique(['document_type', 'period']);
        });

        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->constrained()->restrictOnDelete();
            $table->string('receipt_number', 30)->unique();
            $table->decimal('amount', 19, 4);
            $table->date('period_start');
            $table->date('period_end');
            $table->string('payment_method', 50);
            $table->string('external_reference', 120)->nullable();
            $table->string('idempotency_key', 64)->unique();
            $table->char('request_hash', 64);
            $table->timestamp('paid_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_platform_admin_id')->constrained('platform_admins')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['store_id', 'paid_at']);
            $table->index(['subscription_id', 'period_end']);
        });

        $now = now();
        $planId = DB::table('plans')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'code' => 'starter-default',
            'name' => 'Starter Default',
            'description' => 'Paket bawaan aman untuk toko Stage 1.',
            'monthly_price' => 0,
            'max_products' => 1000,
            'max_members' => 20,
            'is_default' => true,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('stores')->orderBy('id')->eachById(function (object $store) use ($planId, $now): void {
            DB::table('subscriptions')->insert([
                'public_id' => (string) Str::ulid(),
                'store_id' => $store->id,
                'plan_id' => $planId,
                'status' => 'active',
                'starts_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
        Schema::dropIfExists('platform_sequences');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
    }
};
