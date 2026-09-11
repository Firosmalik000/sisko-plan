<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `devices` — registrasi push (FCM/APNs) per-perangkat milik user
 * (design §10, Req 15.1/15.6).
 *
 * `device_id` berasal dari token per-perangkat (`personal_access_tokens.device_id`).
 * Unik per (user_id, device_id) sehingga registrasi ulang dari perangkat sama
 * meng-upsert baris yang sama (idempotent). `public_id` (ULID) dipakai sebagai
 * route key untuk revoke `DELETE /devices/{device}`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('device_id');
            $table->string('platform', 10);
            $table->text('push_token');
            $table->string('push_provider', 10);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'device_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
