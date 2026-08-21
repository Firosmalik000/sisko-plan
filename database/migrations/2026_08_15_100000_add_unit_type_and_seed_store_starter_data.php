<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /** @var list<string> */
    private const CATEGORIES = [
        'Minuman', 'Makanan', 'Snack', 'Rokok', 'Bumbu Dapur',
        'Kebutuhan Mandi', 'Pembersih', 'Obat',
    ];

    /** @var list<array{name: string, symbol: string, unit_type: string}> */
    private const UNITS = [
        ['name' => 'Dus', 'symbol' => 'dus', 'unit_type' => 'large'],
        ['name' => 'Lusin', 'symbol' => 'lusin', 'unit_type' => 'large'],
        ['name' => 'Slop', 'symbol' => 'slop', 'unit_type' => 'large'],
        ['name' => 'Renceng', 'symbol' => 'renceng', 'unit_type' => 'large'],
        ['name' => 'Karung', 'symbol' => 'karung', 'unit_type' => 'large'],
        ['name' => 'Krat', 'symbol' => 'krat', 'unit_type' => 'large'],
        ['name' => 'Drum', 'symbol' => 'drum', 'unit_type' => 'large'],
        ['name' => 'Jerigen', 'symbol' => 'jerigen', 'unit_type' => 'large'],
        ['name' => 'Pack', 'symbol' => 'pack', 'unit_type' => 'large'],
        ['name' => 'Kodi', 'symbol' => 'kodi', 'unit_type' => 'large'],
        ['name' => 'Pcs', 'symbol' => 'pcs', 'unit_type' => 'retail'],
        ['name' => 'Kilogram', 'symbol' => 'kg', 'unit_type' => 'retail'],
        ['name' => 'Gram', 'symbol' => 'g', 'unit_type' => 'retail'],
        ['name' => 'Bungkus', 'symbol' => 'bks', 'unit_type' => 'retail'],
        ['name' => 'Sachet', 'symbol' => 'sachet', 'unit_type' => 'retail'],
        ['name' => 'Butir', 'symbol' => 'butir', 'unit_type' => 'retail'],
        ['name' => 'Botol', 'symbol' => 'btl', 'unit_type' => 'retail'],
        ['name' => 'Liter', 'symbol' => 'l', 'unit_type' => 'retail'],
        ['name' => 'Ikat', 'symbol' => 'ikat', 'unit_type' => 'retail'],
    ];

    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->string('unit_type', 20)->default('retail')->after('symbol');
            $table->index(['store_id', 'unit_type', 'is_active']);
        });

        DB::transaction(function (): void {
            DB::table('stores')->select('id')->lazyById()->each(function (object $store): void {
                $storeId = (int) $store->id;
                $timestamp = now();

                foreach (self::CATEGORIES as $name) {
                    if (DB::table('categories')->where('store_id', $storeId)->where('name', $name)->exists()) {
                        continue;
                    }

                    DB::table('categories')->insert([
                        'public_id' => (string) Str::ulid(),
                        'store_id' => $storeId,
                        'name' => $name,
                        'is_active' => true,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                }

                foreach (self::UNITS as $starter) {
                    $unit = DB::table('units')
                        ->where('store_id', $storeId)
                        ->where(fn ($query) => $query
                            ->where('name', $starter['name'])
                            ->orWhere('symbol', $starter['symbol']))
                        ->first(['id']);

                    if ($unit) {
                        DB::table('units')->where('id', $unit->id)->update([
                            'unit_type' => $starter['unit_type'],
                            'updated_at' => $timestamp,
                        ]);

                        continue;
                    }

                    DB::table('units')->insert([
                        'public_id' => (string) Str::ulid(),
                        'store_id' => $storeId,
                        ...$starter,
                        'is_active' => true,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                }
            });
        });
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'unit_type', 'is_active']);
            $table->dropColumn('unit_type');
        });
    }
};
