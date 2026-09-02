<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->char('theme_color', 7)->default('#ee4d2d')->change();
        });

        DB::table('store_settings')
            ->whereRaw('LOWER(theme_color) = ?', ['#1f6653'])
            ->update(['theme_color' => '#ee4d2d']);
    }

    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->char('theme_color', 7)->default('#1f6653')->change();
        });
    }
};
