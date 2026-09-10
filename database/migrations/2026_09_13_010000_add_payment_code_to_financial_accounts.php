<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_accounts', function (Blueprint $table): void {
            $table->string('payment_code', 40)->nullable()->after('marketplace_code');
            $table->unique(['store_id', 'payment_code']);
        });
    }

    public function down(): void
    {
        Schema::table('financial_accounts', function (Blueprint $table): void {
            $table->dropUnique(['store_id', 'payment_code']);
            $table->dropColumn('payment_code');
        });
    }
};
