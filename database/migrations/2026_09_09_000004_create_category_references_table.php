<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_references', function (Blueprint $table): void {
            $table->string('code', 80)->primary();
            $table->string('name', 120);
            $table->boolean('is_active');
            $table->string('catalog_version', 80);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_references');
    }
};
