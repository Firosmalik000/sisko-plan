<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path')->nullable()->after('email');
        });

        Schema::table('store_settings', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('locale');
            $table->string('email')->nullable()->after('phone');
            $table->string('address', 500)->nullable()->after('email');
            $table->string('receipt_header', 120)->nullable()->after('address');
            $table->string('receipt_footer', 240)->nullable()->after('receipt_header');
            $table->string('receipt_paper_size', 10)->default('58mm')->after('receipt_footer');
            $table->boolean('receipt_show_address')->default(true)->after('receipt_paper_size');
            $table->boolean('receipt_show_cashier')->default(true)->after('receipt_show_address');
            $table->string('printer_name', 120)->nullable()->after('receipt_show_cashier');
            $table->boolean('auto_print_receipt')->default(false)->after('printer_name');
            $table->unsignedTinyInteger('receipt_copies')->default(1)->after('auto_print_receipt');
            $table->char('theme_color', 7)->default('#1f6653')->after('receipt_copies');
        });
    }

    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->dropColumn([
                'phone', 'email', 'address', 'receipt_header', 'receipt_footer',
                'receipt_paper_size', 'receipt_show_address', 'receipt_show_cashier',
                'printer_name', 'auto_print_receipt', 'receipt_copies', 'theme_color',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('avatar_path');
        });
    }
};
