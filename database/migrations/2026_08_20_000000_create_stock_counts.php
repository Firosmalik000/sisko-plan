<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_counts', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('document_number', 30);
            $table->string('status', 20)->default('draft');
            $table->timestamp('snapshot_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('completed_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('posted_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('cancelled_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['store_id', 'document_number']);
            $table->index(['store_id', 'status', 'created_at']);
        });

        Schema::create('stock_count_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_count_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('system_quantity', 18, 6);
            $table->decimal('counted_quantity', 18, 6)->nullable();
            $table->decimal('difference_quantity', 18, 6)->nullable();
            $table->decimal('snapshot_unit_cost', 19, 4);
            $table->timestamps();

            $table->unique(['stock_count_id', 'product_id']);
            $table->index(['store_id', 'stock_count_id']);
        });

        Schema::table('stock_adjustments', function (Blueprint $table): void {
            $table->foreignId('stock_count_id')
                ->nullable()
                ->after('store_id')
                ->constrained()
                ->restrictOnDelete();
            $table->index(['store_id', 'stock_count_id']);
        });
    }

    public function down(): void
    {
        Schema::table('stock_adjustments', function (Blueprint $table): void {
            $table->dropForeign(['stock_count_id']);
            $table->dropIndex(['store_id', 'stock_count_id']);
            $table->dropColumn('stock_count_id');
        });

        Schema::dropIfExists('stock_count_items');
        Schema::dropIfExists('stock_counts');
    }
};
