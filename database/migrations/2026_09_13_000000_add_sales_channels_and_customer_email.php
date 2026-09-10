<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->string('email', 254)->nullable()->after('phone_normalized');
        });

        Schema::table('financial_accounts', function (Blueprint $table): void {
            $table->string('marketplace_code', 40)->nullable()->after('type');
            $table->unique(['store_id', 'marketplace_code']);
        });

        Schema::table('sales', function (Blueprint $table): void {
            $table->string('customer_email', 254)->nullable()->after('customer_phone');
            $table->string('sales_channel', 20)->default('in_store')->after('customer_email');
            $table->string('marketplace_code', 40)->nullable()->after('sales_channel');
            $table->string('external_order_number', 100)->nullable()->after('marketplace_code');
            $table->index(['store_id', 'sales_channel', 'occurred_at']);
            $table->index(['store_id', 'marketplace_code', 'occurred_at']);
            $table->index(['store_id', 'external_order_number']);
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table): void {
            $table->dropIndex(['store_id', 'external_order_number']);
            $table->dropIndex(['store_id', 'marketplace_code', 'occurred_at']);
            $table->dropIndex(['store_id', 'sales_channel', 'occurred_at']);
            $table->dropColumn(['customer_email', 'sales_channel', 'marketplace_code', 'external_order_number']);
        });

        Schema::table('financial_accounts', function (Blueprint $table): void {
            $table->dropUnique(['store_id', 'marketplace_code']);
            $table->dropColumn('marketplace_code');
        });

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropColumn('email');
        });
    }
};
