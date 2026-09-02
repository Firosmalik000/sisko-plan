<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_alert_reads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_balance_id')->constrained('inventory_balances')->cascadeOnDelete();
            $table->decimal('quantity', 18, 6);
            $table->decimal('minimum_quantity', 18, 6);
            $table->timestamp('balance_updated_at')->nullable();
            $table->timestamp('read_at');
            $table->timestamps();

            $table->unique(['user_id', 'inventory_balance_id']);
            $table->index(['user_id', 'store_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_alert_reads');
    }
};
