<?php

namespace App\Services\Customer;

use App\Models\Product;
use App\Support\CurrentStore;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * @phpstan-type SearchItem array{id: string, title: string, meta: string|null, href: string}
 * @phpstan-type SearchGroup array{type: string, label: string, items: array<int, SearchItem>}
 */
class GlobalSearch
{
    private const LIMIT_PER_GROUP = 5;

    public function __construct(private CurrentStore $currentStore) {}

    /** @return array<int, SearchGroup> */
    public function find(string $term): array
    {
        $groups = [
            $this->destinations($term),
            $this->products($term),
            $this->namedRecords('categories', __('Categories'), 'categories', $term, 'name', route('master-data.categories.index')),
            $this->namedRecords('units', __('Units'), 'units', $term, 'name', route('master-data.units.index'), 'symbol'),
            $this->namedRecords('suppliers', __('Suppliers'), 'suppliers', $term, 'name', route('master-data.suppliers.index'), 'contact_person'),
            $this->namedRecords('accounts', __('Cash & bank'), 'financial_accounts', $term, 'name', route('master-data.financial-accounts.index'), 'type'),
            $this->documents('sales', __('Sales'), 'sales', $term, route('sales.index'), 'customer_name'),
            $this->documents('purchases', __('Purchases'), 'purchases', $term, route('purchasing.index'), 'supplier_invoice_number'),
            $this->documents('expenses', __('Expenses'), 'expenses', $term, route('expenses.index'), 'category_name'),
            $this->documents('stock_counts', __('Stock count'), 'stock_counts', $term, route('operations.stock-opnames.index'), 'status'),
        ];

        return array_values(array_filter($groups, fn (array $group): bool => $group['items'] !== []));
    }

    /** @return SearchGroup */
    private function destinations(string $term): array
    {
        $destinations = collect([
            ['id' => 'checkout', 'title' => __('Checkout'), 'keywords' => 'kasir pos penjualan transaksi', 'href' => route('pos.index')],
            ['id' => 'products', 'title' => __('Products'), 'keywords' => 'produk barang barcode sku master data', 'href' => route('master-data.products.index')],
            ['id' => 'inventory', 'title' => __('Inventory'), 'keywords' => 'stok persediaan gudang', 'href' => route('operations.inventory')],
            ['id' => 'stock-count', 'title' => __('Stock count'), 'keywords' => 'stok opname hitung persediaan', 'href' => route('operations.stock-opnames.index')],
            ['id' => 'sales', 'title' => __('Transaction history'), 'keywords' => 'penjualan transaksi retur struk', 'href' => route('sales.index')],
            ['id' => 'purchases', 'title' => __('Purchases'), 'keywords' => 'pembelian barang masuk supplier hutang', 'href' => route('purchasing.index')],
            ['id' => 'expenses', 'title' => __('Expenses'), 'keywords' => 'biaya pengeluaran', 'href' => route('expenses.index')],
            ['id' => 'cash', 'title' => __('Cash & bank'), 'keywords' => 'kas bank saldo transfer', 'href' => route('operations.cash')],
            ['id' => 'capital', 'title' => __('Capital'), 'keywords' => 'modal investasi penarikan', 'href' => route('operations.capital')],
            ['id' => 'reports', 'title' => __('Business reports'), 'keywords' => 'laporan report laba penjualan ringkasan', 'href' => route('reports.index')],
            ['id' => 'stores', 'title' => __('Stores & team'), 'keywords' => 'toko anggota member tim', 'href' => route('stores.index')],
            ['id' => 'settings', 'title' => __('Settings'), 'keywords' => 'pengaturan profil bahasa tampilan keamanan', 'href' => route('profile.edit')],
        ])->filter(function (array $destination) use ($term): bool {
            $haystack = mb_strtolower($destination['title'].' '.$destination['keywords']);

            return str_contains($haystack, mb_strtolower($term));
        })->take(self::LIMIT_PER_GROUP)->map(fn (array $destination): array => $this->item(
            $destination['id'],
            $destination['title'],
            __('Menu'),
            $destination['href'],
        ));

        return $this->group('destinations', __('Menus & actions'), $destinations);
    }

    /** @return SearchGroup */
    private function products(string $term): array
    {
        $products = Product::query()
            ->where('store_id', $this->currentStore->id())
            ->where(function (Builder $query) use ($term): void {
                $query->whereLike('name', "%{$term}%")
                    ->orWhereHas('variants', fn (Builder $variants) => $variants->whereLike('name', "%{$term}%"))
                    ->orWhereHas('productUnits', fn (Builder $units) => $units
                        ->whereLike('sku', "%{$term}%")
                        ->orWhereLike('barcode', "%{$term}%"));
            })
            ->with(['productUnits:id,product_id,sku,barcode'])
            ->limit(self::LIMIT_PER_GROUP * 4)
            ->get(['id', 'public_id', 'name'])
            ->sortByDesc(fn (Product $product): int => $this->productScore($product, $term))
            ->take(self::LIMIT_PER_GROUP);

        return $this->group('products', __('Products'), $products->map(function (Product $product) use ($term): array {
            $code = $product->productUnits
                ->flatMap(fn ($unit) => [$unit->barcode, $unit->sku])
                ->first(fn ($value) => is_string($value) && str_contains(mb_strtolower($value), mb_strtolower($term)));

            return $this->item(
                $product->public_id,
                $product->name,
                $code,
                route('master-data.products.index', ['search' => $product->name]),
            );
        }));
    }

    private function productScore(Product $product, string $term): int
    {
        $needle = mb_strtolower($term);
        $name = mb_strtolower($product->name);
        $codes = $product->productUnits
            ->flatMap(fn ($unit) => [$unit->barcode, $unit->sku])
            ->filter(fn ($value): bool => is_string($value))
            ->map(fn (string $value): string => mb_strtolower($value));

        return match (true) {
            $codes->contains($needle) => 400,
            $name === $needle => 300,
            $codes->contains(fn (string $code): bool => str_starts_with($code, $needle)) => 250,
            str_starts_with($name, $needle) => 200,
            default => 100,
        };
    }

    /** @return SearchGroup */
    private function namedRecords(
        string $type,
        string $label,
        string $table,
        string $term,
        string $titleColumn,
        string $href,
        ?string $metaColumn = null,
    ): array {
        $columns = ['public_id', $titleColumn];

        if ($metaColumn !== null) {
            $columns[] = $metaColumn;
        }

        $records = DB::table($table)
            ->where('store_id', $this->currentStore->id())
            ->where(function (QueryBuilder $builder) use ($term, $titleColumn, $metaColumn): void {
                $builder->whereLike($titleColumn, "%{$term}%");

                if ($metaColumn !== null) {
                    $builder->orWhereLike($metaColumn, "%{$term}%");
                }
            })
            ->limit(self::LIMIT_PER_GROUP)
            ->get($columns)
            ->map(fn (stdClass $record): array => $this->item(
                $record->public_id,
                (string) $record->{$titleColumn},
                $metaColumn === null ? null : (string) $record->{$metaColumn},
                $href.'?'.http_build_query(['search' => $record->{$titleColumn}]),
            ));

        return $this->group($type, $label, $records);
    }

    /** @return SearchGroup */
    private function documents(string $type, string $label, string $table, string $term, string $href, ?string $metaColumn = null): array
    {
        $query = DB::table($table)
            ->where('store_id', $this->currentStore->id())
            ->where(function (QueryBuilder $builder) use ($term, $metaColumn): void {
                $builder->whereLike('document_number', "%{$term}%");

                if ($metaColumn !== null) {
                    $builder->orWhereLike($metaColumn, "%{$term}%");
                }
            });

        $columns = ['public_id', 'document_number'];

        if ($metaColumn !== null) {
            $columns[] = $metaColumn;
        }

        $records = $query->latest('id')->limit(self::LIMIT_PER_GROUP)->get($columns)->map(
            fn (stdClass $record): array => $this->item(
                $record->public_id,
                (string) $record->document_number,
                $metaColumn === null ? null : (string) $record->{$metaColumn},
                $href.'?'.http_build_query(['search' => $record->document_number]),
            ),
        );

        return $this->group($type, $label, $records);
    }

    /**
     * @param  iterable<int, SearchItem>  $items
     * @return SearchGroup
     */
    private function group(string $type, string $label, iterable $items): array
    {
        $normalizedItems = [];

        foreach ($items as $item) {
            $normalizedItems[] = $item;
        }

        return ['type' => $type, 'label' => $label, 'items' => $normalizedItems];
    }

    /** @return array{id: string, title: string, meta: string|null, href: string} */
    private function item(string $id, string $title, ?string $meta, string $href): array
    {
        return ['id' => $id, 'title' => $title, 'meta' => $meta ?: null, 'href' => $href];
    }
}
