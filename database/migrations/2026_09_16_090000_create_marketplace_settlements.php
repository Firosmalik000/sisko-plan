<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_settlements', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->foreignId('marketplace_id')->constrained()->restrictOnDelete();
            $table->foreignId('clearing_account_id')->constrained('financial_accounts')->restrictOnDelete();
            $table->foreignId('destination_account_id')->constrained('financial_accounts')->restrictOnDelete();
            $table->char('currency_code', 3);
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
            $table->decimal('gross_amount', 19, 4);
            $table->decimal('fee_amount', 19, 4);
            $table->decimal('other_deduction_amount', 19, 4);
            $table->decimal('net_amount', 19, 4);
            $table->string('idempotency_key', 64);
            $table->char('request_hash', 64);
            $table->foreignId('created_by_business_membership_id');
            $table->foreign('created_by_business_membership_id', 'marketplace_settlements_created_by_member_fk')
                ->references('id')->on('business_memberships')->restrictOnDelete();
            $table->foreignId('reversal_of_settlement_id')->nullable()->constrained('marketplace_settlements')->restrictOnDelete();
            $table->timestamp('occurred_at');
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'idempotency_key']);
            $table->unique('reversal_of_settlement_id');
        });
        Schema::create('marketplace_settlement_sales', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('marketplace_settlement_id')->constrained()->restrictOnDelete();
            $table->foreignId('sale_id')->constrained()->restrictOnDelete();
            $table->decimal('gross_amount', 19, 4);
            $table->timestamps();
            $table->unique(['marketplace_settlement_id', 'sale_id'], 'settlement_sale_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_settlement_sales');
        Schema::dropIfExists('marketplace_settlements');
    }
};
