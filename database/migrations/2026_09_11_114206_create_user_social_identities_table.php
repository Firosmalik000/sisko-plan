<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_social_identities', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('provider', 20);
            $table->string('provider_subject');
            $table->string('email')->nullable();
            $table->timestamps();
            $table->unique(['provider', 'provider_subject']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_social_identities');
    }
};
