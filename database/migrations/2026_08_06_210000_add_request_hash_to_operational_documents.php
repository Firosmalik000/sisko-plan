<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['stock_adjustments', 'account_transfers', 'capital_transactions', 'cash_transactions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->char('request_hash', 64)->nullable()->after('idempotency_key');
            });
        }
    }

    public function down(): void
    {
        foreach (['stock_adjustments', 'account_transfers', 'capital_transactions', 'cash_transactions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn('request_hash');
            });
        }
    }
};
