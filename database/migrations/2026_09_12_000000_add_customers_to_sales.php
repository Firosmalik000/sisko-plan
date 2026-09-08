<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('name', 160);
            $table->string('phone', 30);
            $table->string('phone_normalized', 24);
            $table->timestamps();
            $table->unique(['store_id', 'phone_normalized']);
            $table->index(['store_id', 'name']);
        });

        Schema::table('sales', function (Blueprint $table): void {
            $table->foreignId('customer_id')->nullable()->after('store_id')->constrained('customers')->restrictOnDelete();
            $table->string('customer_name', 160)->nullable()->after('document_number');
            $table->string('customer_phone', 30)->nullable()->after('customer_name');
            $table->index(['store_id', 'customer_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table): void {
            $table->dropIndex(['store_id', 'customer_id', 'occurred_at']);
            $table->dropForeign(['customer_id']);
            $table->dropColumn(['customer_id', 'customer_name', 'customer_phone']);
        });

        Schema::dropIfExists('customers');
    }
};
