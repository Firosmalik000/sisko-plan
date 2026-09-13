<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('countries', function (Blueprint $table): void {
            $table->string('default_timezone', 64)->nullable()->after('currency_code');
            $table->renameColumn('name_en', 'name');
        });
        Schema::table('countries', function (Blueprint $table): void {
            $table->dropColumn(['name_id', 'name_ms']);
        });

        $now = now();
        DB::table('currencies')->upsert([
            ['code' => 'BND', 'name' => 'Brunei Dollar', 'symbol' => 'B$', 'decimal_places' => 2, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'KHR', 'name' => 'Cambodian Riel', 'symbol' => '៛', 'decimal_places' => 0, 'symbol_position' => 'after', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'IDR', 'name' => 'Indonesian Rupiah', 'symbol' => 'Rp', 'decimal_places' => 0, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'LAK', 'name' => 'Lao Kip', 'symbol' => '₭', 'decimal_places' => 0, 'symbol_position' => 'after', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'MMK', 'name' => 'Myanmar Kyat', 'symbol' => 'K', 'decimal_places' => 0, 'symbol_position' => 'after', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'MYR', 'name' => 'Malaysian Ringgit', 'symbol' => 'RM', 'decimal_places' => 2, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'PHP', 'name' => 'Philippine Peso', 'symbol' => '₱', 'decimal_places' => 2, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'SGD', 'name' => 'Singapore Dollar', 'symbol' => 'S$', 'decimal_places' => 2, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'THB', 'name' => 'Thai Baht', 'symbol' => '฿', 'decimal_places' => 2, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$', 'decimal_places' => 2, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'VND', 'name' => 'Vietnamese Dong', 'symbol' => '₫', 'decimal_places' => 0, 'symbol_position' => 'after', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ], ['code'], ['name', 'symbol', 'decimal_places', 'symbol_position', 'is_active', 'updated_at']);

        DB::table('countries')->upsert([
            ['code' => 'BN', 'name' => 'Brunei', 'currency_code' => 'BND', 'default_timezone' => 'Asia/Brunei', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'KH', 'name' => 'Cambodia', 'currency_code' => 'KHR', 'default_timezone' => 'Asia/Phnom_Penh', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'ID', 'name' => 'Indonesia', 'currency_code' => 'IDR', 'default_timezone' => 'Asia/Jakarta', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'LA', 'name' => 'Laos', 'currency_code' => 'LAK', 'default_timezone' => 'Asia/Vientiane', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'MY', 'name' => 'Malaysia', 'currency_code' => 'MYR', 'default_timezone' => 'Asia/Kuala_Lumpur', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'MM', 'name' => 'Myanmar', 'currency_code' => 'MMK', 'default_timezone' => 'Asia/Yangon', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'PH', 'name' => 'Philippines', 'currency_code' => 'PHP', 'default_timezone' => 'Asia/Manila', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'SG', 'name' => 'Singapore', 'currency_code' => 'SGD', 'default_timezone' => 'Asia/Singapore', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'TH', 'name' => 'Thailand', 'currency_code' => 'THB', 'default_timezone' => 'Asia/Bangkok', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'TL', 'name' => 'Timor-Leste', 'currency_code' => 'USD', 'default_timezone' => 'Asia/Dili', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'VN', 'name' => 'Vietnam', 'currency_code' => 'VND', 'default_timezone' => 'Asia/Ho_Chi_Minh', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ], ['code'], ['name', 'currency_code', 'default_timezone', 'is_active', 'updated_at']);

        Schema::table('countries', function (Blueprint $table): void {
            $table->string('default_timezone', 64)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table): void {
            $table->string('name_id', 100)->nullable()->after('code');
            $table->string('name_ms', 100)->nullable()->after('name_id');
        });
        DB::table('countries')->orderBy('id')->eachById(function (object $country): void {
            DB::table('countries')->where('id', $country->id)->update([
                'name_id' => $country->name,
                'name_ms' => $country->name,
            ]);
        });
        Schema::table('countries', function (Blueprint $table): void {
            $table->renameColumn('name', 'name_en');
            $table->dropColumn('default_timezone');
        });
    }
};
