<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registers', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->string('name', 120);
            $table->foreignId('cash_financial_account_id')->constrained('financial_accounts')->restrictOnDelete();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->index(['store_id', 'status']);
        });

        Schema::create('register_sessions', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->foreignId('register_id')->constrained()->restrictOnDelete();
            $table->foreignId('pos_device_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('opened_by_business_membership_id')->constrained('business_memberships')->restrictOnDelete();
            $table->foreignId('closed_by_business_membership_id')->nullable()->constrained('business_memberships')->restrictOnDelete();
            $table->char('currency_code', 3);
            $table->decimal('opening_cash', 19, 4);
            $table->decimal('expected_cash', 19, 4)->nullable();
            $table->decimal('counted_cash', 19, 4)->nullable();
            $table->decimal('variance', 19, 4)->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->string('status', 20)->default('open');
            $table->timestamps();
            $table->index(['register_id', 'status']);
            $table->index(['store_id', 'opened_at']);
        });

        Schema::create('pos_action_approvals', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->foreignId('pos_device_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('cashier_business_membership_id')->constrained('business_memberships')->restrictOnDelete();
            $table->foreignId('approver_business_membership_id')->constrained('business_memberships')->restrictOnDelete();
            $table->string('action', 80);
            $table->string('target_type')->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'action', 'expires_at']);
        });

        Schema::create('register_drawer_movements', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->foreignId('register_session_id')->constrained()->restrictOnDelete();
            $table->string('direction', 20);
            $table->decimal('amount', 19, 4);
            $table->string('reason', 255);
            $table->foreignId('actor_business_membership_id')->constrained('business_memberships')->restrictOnDelete();
            $table->foreignId('approval_id')->nullable()->constrained('pos_action_approvals')->restrictOnDelete();
            $table->foreignId('reversal_of_movement_id')->nullable()->constrained('register_drawer_movements')->restrictOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['register_session_id', 'occurred_at']);
        });

        Schema::table('cash_transactions', function (Blueprint $table): void {
            $table->foreignId('register_session_id')->nullable()->constrained()->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cash_transactions', fn (Blueprint $table) => $table->dropConstrainedForeignId('register_session_id'));
        Schema::dropIfExists('register_drawer_movements');
        Schema::dropIfExists('pos_action_approvals');
        Schema::dropIfExists('register_sessions');
        Schema::dropIfExists('registers');
    }
};
