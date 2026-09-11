<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tambah identifier publik ULID untuk user agar Api_V1 tidak pernah
     * mengekspos integer id mentah (design §3.3: user.public_id = ULID).
     * Nullable + backfill agar aman untuk data existing tanpa downtime.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->ulid('public_id')->nullable()->after('id')->unique();
        });

        User::query()->whereNull('public_id')->eachById(function (User $user): void {
            $user->forceFill(['public_id' => (string) Str::ulid()])->saveQuietly();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['public_id']);
            $table->dropColumn('public_id');
        });
    }
};
