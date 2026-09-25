<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->string('tracking_mode', 20)->default('standard')->after('quantity_mode');
        });

        Schema::create('product_serial_numbers', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('agent_number', 80)->nullable();
            $table->string('agent_name', 120)->nullable();
            $table->string('agent_position', 20)->default('prefix');
            $table->string('serial_number', 100);
            $table->string('full_serial_number', 180)->nullable();
            $table->string('status', 20)->default('available');
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->foreignId('sale_item_id')->nullable()->constrained('sale_items')->nullOnDelete();
            $table->timestamp('sold_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'status', 'serial_number'], 'psn_store_status_serial_idx');
            $table->index(['store_id', 'status', 'agent_number'], 'psn_store_status_agent_idx');
            $table->index(['store_id', 'full_serial_number'], 'psn_store_full_serial_idx');
            $table->index(['store_id', 'product_id', 'status'], 'psn_store_prod_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_serial_numbers');

        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('tracking_mode');
        });
    }
};
