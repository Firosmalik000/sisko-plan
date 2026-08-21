<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('parent_product_id')->nullable()->after('store_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('stock_product_id')->nullable()->after('parent_product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('large_unit_id')->nullable()->after('base_unit_id')->constrained('units')->restrictOnDelete();
            $table->string('variant_mode', 20)->default('none')->after('large_unit_id');
            $table->string('variant_name', 120)->nullable()->after('variant_mode');
            $table->string('photo_path', 500)->nullable()->after('description');
            $table->boolean('is_inventory_item')->default(true)->after('photo_path');
            $table->index(['store_id', 'parent_product_id', 'is_active'], 'products_parent_active_index');
            $table->index(['store_id', 'stock_product_id'], 'products_stock_owner_index');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_parent_active_index');
            $table->dropIndex('products_stock_owner_index');
            $table->dropConstrainedForeignId('stock_product_id');
            $table->dropConstrainedForeignId('parent_product_id');
            $table->dropConstrainedForeignId('large_unit_id');
            $table->dropColumn(['variant_mode', 'variant_name', 'photo_path', 'is_inventory_item']);
        });
    }
};
