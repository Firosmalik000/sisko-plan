<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_payments', function (Blueprint $table) {
            $table->string('payment_method', 20)->default('cash')->after('financial_account_id');
        });

        DB::table('sale_payments')
            ->join('financial_accounts', 'financial_accounts.id', '=', 'sale_payments.financial_account_id')
            ->where('financial_accounts.type', '!=', 'cash')
            ->update(['sale_payments.payment_method' => 'qris']);
    }

    public function down(): void
    {
        Schema::table('sale_payments', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });
    }
};
