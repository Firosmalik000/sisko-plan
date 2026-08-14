<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('description', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['store_id', 'name']);
            $table->index(['store_id', 'is_active']);
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('expense_category_id')->constrained()->restrictOnDelete();
            $table->foreignId('financial_account_id')->constrained()->restrictOnDelete();
            $table->string('document_number', 30);
            $table->string('category_name', 120);
            $table->string('account_name', 120);
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
            $table->index(['store_id', 'occurred_at']);
            $table->index(['store_id', 'expense_category_id', 'occurred_at'], 'expense_category_history_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
    }
};
