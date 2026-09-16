<?php

use App\Enums\BusinessStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->string('name', 160);
            $table->string('status', 20)->default(BusinessStatus::Active->value)->index();
            $table->timestamps();
        });

        Schema::create('business_memberships', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('display_name', 120);
            $table->string('business_role', 20);
            $table->string('status', 20)->default('active');
            $table->string('pos_pin_hash')->nullable();
            $table->timestamp('pin_changed_at')->nullable();
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
            $table->unique(['business_id', 'user_id']);
            $table->index(['business_id', 'business_role', 'status']);
        });

        Schema::table('stores', function (Blueprint $table): void {
            $table->foreignId('business_id')->nullable()->after('public_id')->constrained()->restrictOnDelete();
        });

        Schema::table('store_memberships', function (Blueprint $table): void {
            $table->foreignId('user_id')->nullable()->change();
            $table->foreignId('business_membership_id')->nullable()->after('store_id')->constrained()->cascadeOnDelete();
            $table->unique(['store_id', 'business_membership_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_memberships', function (Blueprint $table): void {
            $table->dropUnique(['store_id', 'business_membership_id']);
            $table->dropConstrainedForeignId('business_membership_id');
            $table->foreignId('user_id')->nullable(false)->change();
        });

        Schema::table('stores', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('business_id');
        });

        Schema::dropIfExists('business_memberships');
        Schema::dropIfExists('businesses');
    }
};
