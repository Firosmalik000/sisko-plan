<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'google_id')) {
            return;
        }

        $now = now();

        DB::table('users')
            ->whereNotNull('google_id')
            ->orderBy('id')
            ->select(['id', 'google_id', 'email'])
            ->chunkById(500, function ($users) use ($now): void {
                foreach ($users as $user) {
                    $exists = DB::table('user_social_identities')
                        ->where('provider', 'google')
                        ->where('provider_subject', (string) $user->google_id)
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    DB::table('user_social_identities')->insert([
                        'public_id' => (string) Str::ulid(),
                        'user_id' => $user->id,
                        'provider' => 'google',
                        'provider_subject' => (string) $user->google_id,
                        'email' => $user->email,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            });
    }

    public function down(): void
    {
        DB::table('user_social_identities')->where('provider', 'google')->delete();
    }
};
