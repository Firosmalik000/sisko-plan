<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CountryCurrencySeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $currencies = [
            ['code' => 'BND', 'name' => 'Brunei Dollar', 'symbol' => 'B$', 'decimal_places' => 2, 'symbol_position' => 'before'],
            ['code' => 'KHR', 'name' => 'Cambodian Riel', 'symbol' => '៛', 'decimal_places' => 0, 'symbol_position' => 'after'],
            ['code' => 'IDR', 'name' => 'Indonesian Rupiah', 'symbol' => 'Rp', 'decimal_places' => 0, 'symbol_position' => 'before'],
            ['code' => 'LAK', 'name' => 'Lao Kip', 'symbol' => '₭', 'decimal_places' => 0, 'symbol_position' => 'after'],
            ['code' => 'MYR', 'name' => 'Malaysian Ringgit', 'symbol' => 'RM', 'decimal_places' => 2, 'symbol_position' => 'before'],
            ['code' => 'MMK', 'name' => 'Myanmar Kyat', 'symbol' => 'K', 'decimal_places' => 0, 'symbol_position' => 'after'],
            ['code' => 'PHP', 'name' => 'Philippine Peso', 'symbol' => '₱', 'decimal_places' => 2, 'symbol_position' => 'before'],
            ['code' => 'SGD', 'name' => 'Singapore Dollar', 'symbol' => 'S$', 'decimal_places' => 2, 'symbol_position' => 'before'],
            ['code' => 'THB', 'name' => 'Thai Baht', 'symbol' => '฿', 'decimal_places' => 2, 'symbol_position' => 'before'],
            ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$', 'decimal_places' => 2, 'symbol_position' => 'before'],
            ['code' => 'VND', 'name' => 'Vietnamese Dong', 'symbol' => '₫', 'decimal_places' => 0, 'symbol_position' => 'after'],
        ];
        DB::table('currencies')->insertOrIgnore(array_map(fn (array $currency): array => $currency + [
            'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ], $currencies));

        $countries = [
            ['code' => 'BN', 'name' => 'Brunei', 'currency_code' => 'BND', 'default_timezone' => 'Asia/Brunei'],
            ['code' => 'KH', 'name' => 'Cambodia', 'currency_code' => 'KHR', 'default_timezone' => 'Asia/Phnom_Penh'],
            ['code' => 'ID', 'name' => 'Indonesia', 'currency_code' => 'IDR', 'default_timezone' => 'Asia/Jakarta'],
            ['code' => 'LA', 'name' => 'Laos', 'currency_code' => 'LAK', 'default_timezone' => 'Asia/Vientiane'],
            ['code' => 'MY', 'name' => 'Malaysia', 'currency_code' => 'MYR', 'default_timezone' => 'Asia/Kuala_Lumpur'],
            ['code' => 'MM', 'name' => 'Myanmar', 'currency_code' => 'MMK', 'default_timezone' => 'Asia/Yangon'],
            ['code' => 'PH', 'name' => 'Philippines', 'currency_code' => 'PHP', 'default_timezone' => 'Asia/Manila'],
            ['code' => 'SG', 'name' => 'Singapore', 'currency_code' => 'SGD', 'default_timezone' => 'Asia/Singapore'],
            ['code' => 'TH', 'name' => 'Thailand', 'currency_code' => 'THB', 'default_timezone' => 'Asia/Bangkok'],
            ['code' => 'TL', 'name' => 'Timor-Leste', 'currency_code' => 'USD', 'default_timezone' => 'Asia/Dili'],
            ['code' => 'VN', 'name' => 'Vietnam', 'currency_code' => 'VND', 'default_timezone' => 'Asia/Ho_Chi_Minh'],
        ];
        DB::table('countries')->insertOrIgnore(array_map(fn (array $country): array => $country + [
            'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ], $countries));
    }
}
