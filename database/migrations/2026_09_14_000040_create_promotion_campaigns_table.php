<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `promotion_campaigns` — kampanye promosi/sponsored placement transparan
 * (design §4.1, §11, Req 20.7).
 *
 * Sponsored placement WAJIB berlabel (`disclosure_label`) yang dapat dibaca
 * screen reader. `priority` bounded (unsignedSmallInteger). `market_targeting`
 * + `active_from`/`active_until` mengontrol visibilitas market-aware sejalan
 * dengan item katalog. `catalog_item_id` nullable: kampanye dapat menyorot satu
 * item tertentu atau bersifat umum.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotion_campaigns', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('partner_id')->constrained('distribution_partners')->cascadeOnDelete();
            $table->foreignId('catalog_item_id')->nullable()->constrained('distribution_catalog_items')->nullOnDelete();
            $table->json('allowed_placements')->nullable();
            $table->json('localized_copy')->nullable();
            $table->timestamp('active_from')->nullable();
            $table->timestamp('active_until')->nullable();
            $table->json('market_targeting')->nullable();
            $table->string('disclosure_label');
            $table->unsignedSmallInteger('priority')->default(0);
            $table->string('status', 20)->default('active')->index();
            $table->timestamps();
            $table->index(['catalog_item_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_campaigns');
    }
};
