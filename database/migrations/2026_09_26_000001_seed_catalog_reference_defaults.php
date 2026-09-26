<?php

use Database\Seeders\CatalogReferenceSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        (new CatalogReferenceSeeder)->run();
    }

    public function down(): void
    {
        // No-op to preserve operational data
    }
};
