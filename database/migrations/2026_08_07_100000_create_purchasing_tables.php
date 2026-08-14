<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->string('document_number', 30);
            $table->string('supplier_invoice_number', 100)->nullable();
            $table->decimal('subtotal', 19, 4);
            $table->decimal('discount_amount', 19, 4)->default(0);
            $table->decimal('additional_cost', 19, 4)->default(0);
            $table->decimal('total_amount', 19, 4);
            $table->string('idempotency_key', 64);
            $table->char('request_hash', 64);
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('posted_at');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'document_number']);
            $table->unique(['store_id', 'idempotency_key']);
            $table->unique(['store_id', 'supplier_id', 'supplier_invoice_number'], 'purchase_supplier_invoice_unique');
            $table->index(['store_id', 'supplier_id', 'occurred_at'], 'purchase_supplier_history_index');
        });

        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_unit_id')->constrained()->restrictOnDelete();
            $table->string('product_name', 160);
            $table->string('sku', 80)->nullable();
            $table->string('unit_name', 80);
            $table->string('unit_symbol', 20);
            $table->decimal('quantity', 18, 6);
            $table->decimal('conversion_factor', 18, 6);
            $table->decimal('base_quantity', 18, 6);
            $table->decimal('unit_price', 19, 4);
            $table->decimal('line_subtotal', 19, 4);
            $table->decimal('allocated_discount', 19, 4);
            $table->decimal('allocated_additional_cost', 19, 4);
            $table->decimal('landed_total', 19, 4);
            $table->decimal('base_unit_cost', 19, 4);
            $table->unique(['purchase_id', 'product_id', 'product_unit_id'], 'purchase_item_product_unit_unique');
        });

        Schema::create('purchase_payments', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_id')->constrained()->restrictOnDelete();
            $table->foreignId('financial_account_id')->constrained()->restrictOnDelete();
            $table->string('document_number', 30);
            $table->decimal('amount', 19, 4);
            $table->string('idempotency_key', 64);
            $table->char('request_hash', 64);
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('posted_at');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['store_id', 'document_number']);
            $table->unique(['store_id', 'idempotency_key']);
            $table->index(['store_id', 'purchase_id', 'occurred_at']);
        });

        Schema::create('supplier_payable_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->decimal('balance', 19, 4)->default(0);
            $table->timestamps();
            $table->unique(['store_id', 'supplier_id']);
        });

        Schema::create('supplier_payable_transactions', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->string('direction', 10);
            $table->string('reason', 30);
            $table->decimal('amount', 19, 4);
            $table->decimal('balance_after', 19, 4);
            $table->morphs('reference');
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['store_id', 'supplier_id', 'occurred_at'], 'supplier_payable_history_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payable_transactions');
        Schema::dropIfExists('supplier_payable_balances');
        Schema::dropIfExists('purchase_payments');
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
    }
};
