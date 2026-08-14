<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 20);
            $table->char('period', 6);
            $table->unsignedBigInteger('last_number')->default(0);
            $table->timestamps();
            $table->unique(['store_id', 'document_type', 'period']);
        });

        Schema::create('inventory_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 18, 6)->default(0);
            $table->decimal('average_cost', 19, 4)->default(0);
            $table->decimal('inventory_value', 19, 4)->default(0);
            $table->decimal('minimum_quantity', 18, 6)->default(0);
            $table->timestamps();
            $table->unique(['store_id', 'product_id']);
            $table->index(['store_id', 'quantity']);
        });

        Schema::create('financial_account_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('financial_account_id')->constrained()->restrictOnDelete();
            $table->decimal('balance', 19, 4)->default(0);
            $table->timestamps();
            $table->unique(['store_id', 'financial_account_id']);
        });

        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('document_number', 30);
            $table->string('type', 30);
            $table->string('idempotency_key', 64);
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('posted_at');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'document_number']);
            $table->unique(['store_id', 'idempotency_key']);
            $table->index(['store_id', 'occurred_at']);
        });

        Schema::create('stock_adjustment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_adjustment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity_change', 18, 6);
            $table->decimal('unit_cost', 19, 4);
            $table->decimal('value_change', 19, 4);
            $table->unique(['stock_adjustment_id', 'product_id']);
        });

        Schema::create('account_transfers', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('document_number', 30);
            $table->foreignId('from_account_id')->constrained('financial_accounts')->restrictOnDelete();
            $table->foreignId('to_account_id')->constrained('financial_accounts')->restrictOnDelete();
            $table->decimal('amount', 19, 4);
            $table->string('idempotency_key', 64);
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('posted_at');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'document_number']);
            $table->unique(['store_id', 'idempotency_key']);
            $table->index(['store_id', 'occurred_at']);
        });

        Schema::create('capital_transactions', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('document_number', 30);
            $table->string('type', 30);
            $table->foreignId('financial_account_id')->nullable()->constrained()->restrictOnDelete();
            $table->decimal('total_value', 19, 4);
            $table->string('idempotency_key', 64);
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('posted_at');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'document_number']);
            $table->unique(['store_id', 'idempotency_key']);
            $table->index(['store_id', 'occurred_at']);
        });

        Schema::create('capital_transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('capital_transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 18, 6);
            $table->decimal('unit_cost', 19, 4);
            $table->decimal('total_value', 19, 4);
            $table->unique(['capital_transaction_id', 'product_id'], 'capital_item_product_unique');
        });

        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('financial_account_id')->constrained()->restrictOnDelete();
            $table->string('direction', 10);
            $table->string('reason', 30);
            $table->decimal('amount', 19, 4);
            $table->decimal('balance_after', 19, 4);
            $table->string('idempotency_key', 64)->nullable();
            $table->nullableMorphs('reference');
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['store_id', 'financial_account_id', 'occurred_at'], 'cash_account_history_index');
            $table->unique(['store_id', 'idempotency_key']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('reason', 30);
            $table->decimal('quantity_change', 18, 6);
            $table->decimal('unit_cost', 19, 4);
            $table->decimal('value_change', 19, 4);
            $table->decimal('quantity_after', 18, 6);
            $table->decimal('average_cost_after', 19, 4);
            $table->decimal('inventory_value_after', 19, 4);
            $table->morphs('reference');
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['store_id', 'product_id', 'occurred_at'], 'stock_product_history_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('cash_transactions');
        Schema::dropIfExists('capital_transaction_items');
        Schema::dropIfExists('capital_transactions');
        Schema::dropIfExists('account_transfers');
        Schema::dropIfExists('stock_adjustment_items');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('financial_account_balances');
        Schema::dropIfExists('inventory_balances');
        Schema::dropIfExists('document_sequences');
    }
};
