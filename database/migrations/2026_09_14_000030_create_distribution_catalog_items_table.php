<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `distribution_catalog_items` — item katalog distributor (design §4.1,
 * §11, Req 20.1/20.2).
 *
 * Uang scale 4 (`indicative_price_amount` = harga INDIKATIF, Req 20.6) dan
 * quantity scale 6 (`min_quantity`) konsisten dengan kontrak backend. Katalog
 * READ-ONLY: tidak ada harga transaksional/tombol beli (Req 20.8).
 * `market_targeting` (json array kode negara) + `valid_from`/`valid_until`
 * menentukan visibilitas market-aware (Req 20.1).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('distribution_catalog_items', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('partner_id')->constrained('distribution_partners')->cascadeOnDelete();
            $table->string('partner_sku')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('sales_unit', 40)->nullable();
            $table->decimal('min_quantity', 20, 6)->default('1');
            $table->decimal('indicative_price_amount', 24, 4)->nullable();
            $table->char('currency_code', 3)->nullable();
            $table->string('availability_status', 20)->default('available')->index();
            $table->json('market_targeting')->nullable();
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();
            $table->index(['partner_id', 'availability_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('distribution_catalog_items');
    }
};
