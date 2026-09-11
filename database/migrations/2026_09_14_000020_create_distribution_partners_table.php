<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `distribution_partners` — mitra distribusi/pemasok katalog transparan
 * (design §4.1, §11, Req 20.4).
 *
 * XSISTEN dibuat sebagai partner pertama via DistributionXsistenSeeder.
 *
 * ARAH EKSTENSI (Req 20.10): rilis ini READ-ONLY. Order/komisi/settlement TIDAK
 * dimodelkan sekarang — bukan schema kosong. Bila kelak diperlukan, tambahkan
 * tabel terpisah (mis. `distribution_orders`, `distribution_commissions`,
 * `distribution_settlements`) yang merujuk `distribution_partners.id`, tanpa
 * mengubah kontrak read-only katalog ini.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('distribution_partners', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('logo_url')->nullable();
            $table->json('contact')->nullable();
            $table->string('status', 20)->default('active')->index();
            $table->json('service_markets')->nullable();
            $table->string('disclosure_label')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('distribution_partners');
    }
};
