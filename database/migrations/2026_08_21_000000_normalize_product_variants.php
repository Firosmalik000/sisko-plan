<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var list<string> */
    private array $variantTables = [
        'product_units',
        'inventory_balances',
        'stock_adjustment_items',
        'capital_transaction_items',
        'stock_movements',
        'purchase_items',
        'sale_items',
        'sale_return_items',
        'stock_count_items',
    ];

    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('photo_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['product_id', 'name']);
            $table->index(['store_id', 'product_id', 'is_active']);
        });

        foreach ($this->variantTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId('product_variant_id')->nullable()->after('product_id');
            });
        }

        Schema::table('inventory_balances', function (Blueprint $table): void {
            $table->string('stock_key', 40)->nullable()->after('product_variant_id');
        });

        $timestamp = now();
        DB::table('products')->whereNotNull('parent_product_id')->orderBy('id')->get()->each(
            function (object $child) use ($timestamp): void {
                DB::table('product_variants')->insert([
                    'public_id' => $child->public_id,
                    'store_id' => $child->store_id,
                    'product_id' => $child->parent_product_id,
                    'name' => $child->variant_name ?? $child->name,
                    'is_active' => $child->is_active,
                    'created_at' => $child->created_at ?? $timestamp,
                    'updated_at' => $child->updated_at ?? $timestamp,
                ]);
            },
        );

        // MySQL foreign keys need an index that survives replacement of old unique keys.
        $this->addProductIndexes();
        $this->dropReplacedForeignKeys();
        // Replace product-only uniqueness before multiple variants converge on one parent.
        $this->replaceIndexes();
        $this->restoreReplacedForeignKeys();
        $this->migrateLegacyReferences();

        DB::table('inventory_balances')->orderBy('id')->get(['id', 'product_id', 'product_variant_id'])->each(
            fn (object $balance) => DB::table('inventory_balances')->where('id', $balance->id)->update([
                'stock_key' => $balance->product_variant_id === null
                    ? "product:{$balance->product_id}"
                    : "variant:{$balance->product_variant_id}",
            ]),
        );

        $unmapped = collect($this->variantTables)->sum(
            fn (string $tableName): int => DB::table($tableName)
                ->join('products', 'products.id', '=', "{$tableName}.product_id")
                ->whereNotNull('products.parent_product_id')
                ->count(),
        );
        if ($unmapped > 0) {
            throw new RuntimeException("Variant normalization left {$unmapped} legacy references unmapped.");
        }

        DB::table('products')->whereNotNull('parent_product_id')->delete();

        foreach ($this->variantTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreign('product_variant_id')->references('id')->on('product_variants')->restrictOnDelete();
            });
        }

        Schema::table('inventory_balances', function (Blueprint $table): void {
            $table->string('stock_key', 40)->nullable(false)->change();
            $table->unique(['store_id', 'stock_key']);
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropForeign(['parent_product_id']);
            $table->dropForeign(['stock_product_id']);
            $table->dropIndex('products_parent_active_index');
            $table->dropIndex('products_stock_owner_index');
            $table->dropColumn(['parent_product_id', 'stock_product_id', 'variant_name', 'is_inventory_item']);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Product variant normalization is intentionally irreversible because rolling back would recreate ambiguous product rows.');
    }

    private function migrateLegacyReferences(): void
    {
        $children = DB::table('products')->whereNotNull('parent_product_id')->orderBy('id')->get();
        foreach ($children as $child) {
            $variantId = DB::table('product_variants')->where('public_id', $child->public_id)->value('id');
            $unitIds = DB::table('product_units')->where('product_id', $child->id)->pluck('id');

            foreach (['inventory_balances', 'stock_adjustment_items', 'capital_transaction_items', 'stock_movements', 'stock_count_items'] as $tableName) {
                DB::table($tableName)->where('product_id', $child->id)->update([
                    'product_id' => $child->parent_product_id,
                    'product_variant_id' => $variantId,
                ]);
            }

            foreach (['purchase_items', 'sale_items'] as $tableName) {
                DB::table($tableName)->whereIn('product_unit_id', $unitIds)->update([
                    'product_id' => $child->parent_product_id,
                    'product_variant_id' => $variantId,
                ]);
            }

            DB::table('product_units')->where('product_id', $child->id)->update([
                'product_id' => $child->parent_product_id,
                'product_variant_id' => $variantId,
            ]);
        }

        DB::table('sale_return_items')->orderBy('id')->get(['id', 'sale_item_id'])->each(
            function (object $returnItem): void {
                $saleItem = DB::table('sale_items')->where('id', $returnItem->sale_item_id)->first(['product_id', 'product_variant_id']);
                DB::table('sale_return_items')->where('id', $returnItem->id)->update([
                    'product_id' => $saleItem->product_id,
                    'product_variant_id' => $saleItem->product_variant_id,
                ]);
            },
        );
    }

    private function replaceIndexes(): void
    {
        Schema::table('product_units', function (Blueprint $table): void {
            $table->dropUnique(['product_id', 'unit_id']);
            $table->unique(['product_id', 'product_variant_id', 'unit_id'], 'product_variant_unit_unique');
        });
        Schema::table('inventory_balances', fn (Blueprint $table) => $table->dropUnique(['store_id', 'product_id']));
        Schema::table('stock_adjustment_items', function (Blueprint $table): void {
            $table->dropUnique(['stock_adjustment_id', 'product_id']);
            $table->unique(['stock_adjustment_id', 'product_id', 'product_variant_id'], 'stock_adjustment_item_unique');
        });
        Schema::table('capital_transaction_items', function (Blueprint $table): void {
            $table->dropUnique('capital_item_product_unique');
            $table->unique(['capital_transaction_id', 'product_id', 'product_variant_id'], 'capital_item_stock_unique');
        });
        Schema::table('purchase_items', function (Blueprint $table): void {
            $table->dropUnique('purchase_item_product_unit_unique');
            $table->unique(['purchase_id', 'product_id', 'product_variant_id', 'product_unit_id'], 'purchase_item_variant_unit_unique');
        });
        Schema::table('sale_items', function (Blueprint $table): void {
            $table->dropUnique(['sale_id', 'product_unit_id']);
            $table->unique(['sale_id', 'product_id', 'product_variant_id', 'product_unit_id'], 'sale_item_variant_unit_unique');
        });
        Schema::table('stock_count_items', function (Blueprint $table): void {
            $table->dropUnique(['stock_count_id', 'product_id']);
            $table->unique(['stock_count_id', 'product_id', 'product_variant_id'], 'stock_count_item_variant_unique');
        });
    }

    private function addProductIndexes(): void
    {
        foreach (['product_units', 'inventory_balances', 'stock_adjustment_items', 'capital_transaction_items', 'purchase_items', 'sale_items', 'stock_count_items'] as $tableName) {
            $indexName = "{$tableName}_product_fk_index";
            if (! Schema::hasIndex($tableName, $indexName)) {
                Schema::table($tableName, function (Blueprint $table) use ($indexName): void {
                    $table->index('product_id', $indexName);
                });
            }
        }

    }

    private function dropReplacedForeignKeys(): void
    {
        foreach (['product_units', 'inventory_balances', 'stock_adjustment_items', 'capital_transaction_items', 'purchase_items', 'sale_items', 'stock_count_items'] as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->dropForeign(['product_id']));
        }
        foreach ([
            'stock_adjustment_items' => 'stock_adjustment_id',
            'capital_transaction_items' => 'capital_transaction_id',
            'purchase_items' => 'purchase_id',
            'sale_items' => 'sale_id',
            'stock_count_items' => 'stock_count_id',
        ] as $tableName => $foreignKey) {
            Schema::table($tableName, fn (Blueprint $table) => $table->dropForeign([$foreignKey]));
        }
    }

    private function restoreReplacedForeignKeys(): void
    {
        Schema::table('product_units', fn (Blueprint $table) => $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete());
        foreach (['inventory_balances', 'stock_adjustment_items', 'capital_transaction_items', 'purchase_items', 'sale_items', 'stock_count_items'] as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->foreign('product_id')->references('id')->on('products')->restrictOnDelete());
        }
        foreach ([
            'stock_adjustment_items' => 'stock_adjustments',
            'capital_transaction_items' => 'capital_transactions',
            'purchase_items' => 'purchases',
            'sale_items' => 'sales',
            'stock_count_items' => 'stock_counts',
        ] as $tableName => $parentTable) {
            $foreignKey = str($parentTable)->singular()->append('_id')->toString();
            Schema::table($tableName, fn (Blueprint $table) => $table->foreign($foreignKey)->references('id')->on($parentTable)->cascadeOnDelete());
        }
    }
};
