<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `mobile_notifications` — isi notification center store-scoped untuk app
 * mobile (design §10, Req 15.2).
 *
 * Terpisah dari tabel `notifications` bawaan Laravel (dipakai StockAlert dsb.)
 * agar concern mobile terisolasi dan memetakan langsung ke Drift
 * `local_notifications` (public_id, store, category, title, body, read_at).
 * `category` ∈ operational|promo|security (channel terpisah, Req 15.3).
 * `user_id` nullable: notifikasi tingkat toko (semua anggota) vs per-user.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_notifications', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('category', 20);
            $table->string('title');
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_notifications');
    }
};
