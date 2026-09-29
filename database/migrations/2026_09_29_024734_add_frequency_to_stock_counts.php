<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_counts', function (Blueprint $table): void {
            $table->string('frequency', 20)->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('stock_counts', function (Blueprint $table): void {
            $table->dropColumn('frequency');
        });
    }
};
