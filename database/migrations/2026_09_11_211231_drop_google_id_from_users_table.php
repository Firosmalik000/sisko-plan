<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Drop kolom lama `users.google_id` setelah semua caller (web + mobile)
 * berpindah ke `user_social_identities` (D-003, task 1.9). Reversible: down()
 * membangun ulang kolom dan mem-backfill dari identitas google yang ada.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'google_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['google_id']);
            $table->dropColumn('google_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'google_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->string('google_id')->nullable()->after('email')->unique();
        });

        // Backfill balik dari identitas google (subject = google_id lama).
        DB::table('user_social_identities')
            ->where('provider', 'google')
            ->orderBy('id')
            ->chunkById(500, function ($rows): void {
                foreach ($rows as $row) {
                    DB::table('users')
                        ->where('id', $row->user_id)
                        ->update(['google_id' => $row->provider_subject]);
                }
            });
    }
};
