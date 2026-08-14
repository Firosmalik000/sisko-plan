<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('document_number', 30);
            $table->decimal('subtotal', 19, 4);
            $table->decimal('item_discount_amount', 19, 4)->default(0);
            $table->decimal('transaction_discount_amount', 19, 4)->default(0);
            $table->decimal('total_amount', 19, 4);
            $table->decimal('paid_amount', 19, 4);
            $table->decimal('change_amount', 19, 4)->default(0);
            $table->string('idempotency_key', 64);
            $table->char('request_hash', 64);
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('posted_at');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'document_number']);
            $table->unique(['store_id', 'idempotency_key']);
            $table->index(['store_id', 'occurred_at']);
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_unit_id')->constrained()->restrictOnDelete();
            $table->string('product_name', 160);
            $table->string('sku', 80)->nullable();
            $table->string('barcode', 80)->nullable();
            $table->string('unit_name', 80);
            $table->string('unit_symbol', 20);
            $table->decimal('quantity', 18, 6);
            $table->decimal('conversion_factor', 18, 6);
            $table->decimal('base_quantity', 18, 6);
            $table->decimal('unit_price', 19, 4);
            $table->decimal('gross_subtotal', 19, 4);
            $table->decimal('item_discount_amount', 19, 4)->default(0);
            $table->decimal('allocated_transaction_discount', 19, 4)->default(0);
            $table->decimal('net_total', 19, 4);
            $table->decimal('unit_cost_snapshot', 19, 4);
            $table->decimal('cogs_amount', 19, 4);
            $table->decimal('gross_profit', 19, 4);
            $table->unique(['sale_id', 'product_unit_id']);
            $table->index(['store_id', 'product_id']);
        });

        Schema::create('sale_payments', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->restrictOnDelete();
            $table->foreignId('financial_account_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 19, 4);
            $table->decimal('tendered_amount', 19, 4);
            $table->decimal('change_amount', 19, 4)->default(0);
            $table->timestamp('occurred_at');
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique('sale_id');
        });

        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->restrictOnDelete();
            $table->foreignId('financial_account_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('document_number', 30);
            $table->decimal('refund_amount', 19, 4);
            $table->decimal('cogs_reversed', 19, 4);
            $table->decimal('gross_profit_reversed', 19, 4);
            $table->string('idempotency_key', 64);
            $table->char('request_hash', 64);
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('posted_at');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'document_number']);
            $table->unique(['store_id', 'idempotency_key']);
            $table->index(['store_id', 'sale_id', 'occurred_at']);
        });

        Schema::create('sale_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 18, 6);
            $table->decimal('base_quantity', 18, 6);
            $table->decimal('refund_amount', 19, 4);
            $table->decimal('unit_cost_snapshot', 19, 4);
            $table->decimal('cogs_reversed', 19, 4);
            $table->decimal('gross_profit_reversed', 19, 4);
            $table->unique(['sale_return_id', 'sale_item_id']);
            $table->index(['store_id', 'sale_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_items');
        Schema::dropIfExists('sale_returns');
        Schema::dropIfExists('sale_payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};
