<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->expandCanonicalSchema();
        $this->backfillLegacyProductIdentifiers();
        $this->assertIdentifiersAreUnique();
        $this->addIdentifierIndexes();
        $this->dropLegacyProductIdentifiers();
    }

    public function down(): void
    {
        // These columns are part of the canonical schema in earlier migrations.
        // Keeping them makes rollback safe for installations that only needed repair.
    }

    private function expandCanonicalSchema(): void
    {
        if (! Schema::hasColumn('product_units', 'sku')) {
            Schema::table('product_units', function (Blueprint $table): void {
                $table->string('sku', 80)->nullable()->after('unit_id');
            });
        }

        if (! Schema::hasColumn('product_units', 'barcode')) {
            Schema::table('product_units', function (Blueprint $table): void {
                $table->string('barcode', 120)->nullable()->after('sku');
            });
        }

        if (! Schema::hasColumn('product_variants', 'photo_path')) {
            Schema::table('product_variants', function (Blueprint $table): void {
                $table->string('photo_path')->nullable()->after('name');
            });
        }
    }

    private function backfillLegacyProductIdentifiers(): void
    {
        $legacyColumns = collect(['sku', 'barcode'])
            ->filter(fn (string $column): bool => Schema::hasColumn('products', $column))
            ->values();
        if ($legacyColumns->isEmpty()) {
            return;
        }

        DB::table('products')
            ->orderBy('id')
            ->get(['id', 'base_unit_id', ...$legacyColumns->all()])
            ->each(function (object $product) use ($legacyColumns): void {
                $values = $legacyColumns->mapWithKeys(function (string $column) use ($product): array {
                    $value = trim((string) ($product->{$column} ?? ''));

                    return [$column => $value !== '' ? $value : null];
                })->filter()->all();

                if ($values === []) {
                    return;
                }

                $unit = DB::table('product_units')
                    ->where('product_id', $product->id)
                    ->whereNull('product_variant_id')
                    ->orderByRaw('unit_id = ? desc', [$product->base_unit_id])
                    ->orderByDesc('is_active')
                    ->orderBy('id')
                    ->first(['id', ...array_keys($values)]);

                if ($unit === null) {
                    throw new RuntimeException("Produk {$product->id} memiliki SKU/barcode lama, tetapi tidak memiliki unit default untuk tujuan migrasi.");
                }

                foreach ($values as $column => $value) {
                    $current = trim((string) ($unit->{$column} ?? ''));
                    if ($current !== '' && $current !== $value) {
                        throw new RuntimeException("Produk {$product->id} memiliki {$column} yang berbeda antara products dan product_units.");
                    }
                }

                DB::table('product_units')->where('id', $unit->id)->update($values);
            });
    }

    private function assertIdentifiersAreUnique(): void
    {
        foreach (['sku', 'barcode'] as $column) {
            $duplicate = DB::table('product_units')
                ->select(['store_id', $column])
                ->whereNotNull($column)
                ->where($column, '<>', '')
                ->groupBy('store_id', $column)
                ->havingRaw('count(*) > 1')
                ->first();

            if ($duplicate !== null) {
                throw new RuntimeException("Nilai {$column} duplikat ditemukan pada toko {$duplicate->store_id}: {$duplicate->{$column}}.");
            }
        }
    }

    private function addIdentifierIndexes(): void
    {
        if (! Schema::hasIndex('product_units', 'product_units_store_id_sku_unique')) {
            Schema::table('product_units', function (Blueprint $table): void {
                $table->unique(['store_id', 'sku']);
            });
        }

        if (! Schema::hasIndex('product_units', 'product_units_store_id_barcode_unique')) {
            Schema::table('product_units', function (Blueprint $table): void {
                $table->unique(['store_id', 'barcode']);
            });
        }
    }

    private function dropLegacyProductIdentifiers(): void
    {
        $legacyColumns = collect(['sku', 'barcode'])
            ->filter(fn (string $column): bool => Schema::hasColumn('products', $column))
            ->values();
        if ($legacyColumns->isEmpty()) {
            return;
        }

        foreach (['products_store_id_sku_unique', 'products_store_id_barcode_unique'] as $index) {
            if (Schema::hasIndex('products', $index)) {
                Schema::table('products', function (Blueprint $table) use ($index): void {
                    $table->dropUnique($index);
                });
            }
        }

        Schema::table('products', function (Blueprint $table) use ($legacyColumns): void {
            $table->dropColumn($legacyColumns->all());
        });
    }
};
