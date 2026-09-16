<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table): void {
            $table->foreignId('register_session_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('pos_device_id')->nullable()->constrained()->restrictOnDelete();
            $table->char('currency_code', 3)->nullable();
            $table->index(['store_id', 'created_by_business_membership_id', 'occurred_at'], 'sales_store_cashier_occurred_idx');
        });
        Schema::table('sale_payments', fn (Blueprint $table) => $table->char('currency_code', 3)->nullable());
        Schema::table('sale_returns', function (Blueprint $table): void {
            $table->foreignId('register_session_id')->nullable()->constrained()->restrictOnDelete();
            $table->char('currency_code', 3)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('sale_returns', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('register_session_id');
            $table->dropColumn('currency_code');
        });
        Schema::table('sale_payments', fn (Blueprint $table) => $table->dropColumn('currency_code'));
        Schema::table('sales', function (Blueprint $table): void {
            $table->dropIndex('sales_store_cashier_occurred_idx');
            $table->dropConstrainedForeignId('register_session_id');
            $table->dropConstrainedForeignId('pos_device_id');
            $table->dropColumn('currency_code');
        });
    }
};
