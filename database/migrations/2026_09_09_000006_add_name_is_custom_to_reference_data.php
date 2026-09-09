<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['categories', 'units'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->boolean('name_is_custom')->default(true);
            });
        }
    }

    public function down(): void
    {
        foreach (['categories', 'units'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn('name_is_custom');
            });
        }
    }
};
