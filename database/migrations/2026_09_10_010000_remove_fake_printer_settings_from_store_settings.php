<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table): void {
            $table->dropColumn(['printer_name', 'auto_print_receipt', 'receipt_copies']);
        });
    }

    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table): void {
            $table->string('printer_name', 120)->nullable();
            $table->boolean('auto_print_receipt')->default(false);
            $table->unsignedTinyInteger('receipt_copies')->default(1);
        });
    }
};
