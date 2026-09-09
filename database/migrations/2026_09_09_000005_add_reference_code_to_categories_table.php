<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->string('reference_code', 80)->nullable();
            $table->foreign('reference_code')->references('code')->on('category_references')->restrictOnDelete();
            $table->index(['store_id', 'reference_code']);
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->dropForeign(['reference_code']);
            $table->dropIndex(['store_id', 'reference_code']);
            $table->dropColumn('reference_code');
        });
    }
};
