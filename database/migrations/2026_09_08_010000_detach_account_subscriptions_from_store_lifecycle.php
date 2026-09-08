<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table): void {
            $table->dropForeign(['store_id']);
        });
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropForeign(['store_id']);
        });

        Schema::table('subscription_payments', function (Blueprint $table): void {
            $table->unsignedBigInteger('store_id')->nullable()->change();
            $table->foreign('store_id')->references('id')->on('stores')->nullOnDelete();
        });
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->unsignedBigInteger('store_id')->nullable()->change();
            $table->foreign('store_id')->references('id')->on('stores')->nullOnDelete();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Account subscription history cannot be safely reattached to a deleted store.');
    }
};
