<?php

namespace Tests\Feature\Api\V1;

use App\Actions\Ledgers\PostStockAdjustment;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak `GET /stores/{store}/products` + mutasi produk (design §3.2, Req 10.1,
 * 10.3, 10.4, 24.3): read store-scoped dengan product_units + stock_summary +
 * cursor pagination + search; mutasi menegakkan ability `product.write`.
 */
class ProductsTest extends TestCase
{
    use RefreshDatabase;

    private function ownerAndStore(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        return [$owner, $store];
    }

    private function attach(Store $store, User $user, MembershipRole $role): void
    {
        $store->users()->syncWithoutDetaching([
            $user->id => ['role' => $role->value, 'status' => MembershipStatus::Active->value],
        ]);
    }

    private function makeProduct(Store $store, string $name, string $sellingPrice = '4000', string $stock = '0', ?string $sku = null, ?string $barcode = null): Product
    {
        $product = Product::factory()->for($store)->create(['name' => $name]);
        $product->productUnits()->sole()->update([
            'selling_price' => $sellingPrice,
            'sku' => $sku ?? 'SKU-'.Str::upper(Str::random(6)),
            'barcode' => $barcode ?? fake()->unique()->ean13(),
        ]);

        if ($stock !== '0') {
            app(PostStockAdjustment::class)->handle(
                $store,
                $store->owner,
                'opening',
                [['product_id' => $product->id, 'quantity' => $stock, 'unit_cost' => '1000']],
                '2026-08-07T08:00:00Z',
                null,
                'stock-'.$product->id,
            );
        }

        return $product;
    }

    /**
     * @return array<string, mixed>
     */
    private function mutationPayload(Category $category, Unit $unit, array $overrides = []): array
    {
        return array_merge([
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'Teh Botol',
            'description' => 'Teh siap minum',
            'category_public_id' => $category->public_id,
            'is_active' => true,
            'unit' => [
                'unit_public_id' => $unit->public_id,
                'sku' => 'SKU-API-001',
                'barcode' => '8990000000001',
                'selling_price' => '4000',
                'purchase_price' => '2500',
                'current_stock' => '10',
                'minimum_stock' => '2',
            ],
        ], $overrides);
    }

    public function test_index_returns_store_scoped_products_with_units_and_stock_summary(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $product = $this->makeProduct($store, 'Teh Kotak', '5000', '12');

        // Produk toko lain tidak boleh muncul (tenant isolation).
        $otherStore = Store::factory()->create();
        $this->makeProduct($otherStore, 'Produk Toko Lain');

        Sanctum::actingAs($owner, ['store.read']);

        $response = $this->getJson("/api/v1/stores/{$store->public_id}/products");

        $response->assertOk()
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.public_id', $product->public_id)
            ->assertJsonPath('data.products.0.name', 'Teh Kotak')
            ->assertJsonPath('data.products.0.product_units.0.selling_price', '5000.0000')
            ->assertJsonPath('data.products.0.stock_summary.total_on_hand', '12.000000')
            ->assertJsonPath('data.page.has_more', false);

        // Uang harus string (bukan float/number).
        $this->assertIsString($response->json('data.products.0.product_units.0.selling_price'));
        $this->assertIsString($response->json('data.products.0.stock_summary.total_on_hand'));
    }

    public function test_index_requires_store_read_ability(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        // Token tanpa store.read (hanya membership aktif).
        Sanctum::actingAs($owner, ['sale.create']);

        $this->getJson("/api/v1/stores/{$store->public_id}/products")
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_index_paginates_with_cursor(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        for ($i = 0; $i < 7; $i++) {
            $this->makeProduct($store, "Produk {$i}");
        }
        Sanctum::actingAs($owner, ['store.read']);

        $first = $this->getJson("/api/v1/stores/{$store->public_id}/products?limit=3");
        $first->assertOk()
            ->assertJsonCount(3, 'data.products')
            ->assertJsonPath('data.page.has_more', true);

        $nextCursor = $first->json('data.page.next_cursor');
        $this->assertNotNull($nextCursor);

        $firstIds = collect($first->json('data.products'))->pluck('public_id')->all();

        $second = $this->getJson("/api/v1/stores/{$store->public_id}/products?limit=3&cursor={$nextCursor}");
        $second->assertOk()->assertJsonCount(3, 'data.products');

        $secondIds = collect($second->json('data.products'))->pluck('public_id')->all();

        // Halaman kedua berisi produk berbeda dari halaman pertama.
        $this->assertEmpty(array_intersect($firstIds, $secondIds));
    }

    public function test_search_matches_name_sku_or_barcode_only(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $match = $this->makeProduct($store, 'Kopi Hitam', '3000', '0', 'SKU-KOPI-1', '1112223334445');
        $this->makeProduct($store, 'Susu Segar', '5000', '0', 'SKU-SUSU-1', '9998887776665');
        Sanctum::actingAs($owner, ['store.read']);

        // by name
        $this->getJson("/api/v1/stores/{$store->public_id}/products?q=Kopi")
            ->assertOk()
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.public_id', $match->public_id);

        // by sku
        $this->getJson("/api/v1/stores/{$store->public_id}/products?q=SKU-KOPI-1")
            ->assertOk()
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.public_id', $match->public_id);

        // by barcode
        $this->getJson("/api/v1/stores/{$store->public_id}/products?q=1112223334445")
            ->assertOk()
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.public_id', $match->public_id);
    }

    public function test_owner_with_product_write_can_create_product(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $unit = Unit::factory()->for($store)->create(['name' => 'Pieces', 'symbol' => 'pcs']);
        Sanctum::actingAs($owner, ['store.read', 'product.write']);

        $response = $this->postJson(
            "/api/v1/stores/{$store->public_id}/products",
            $this->mutationPayload($category, $unit),
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Teh Botol')
            ->assertJsonPath('data.category', $category->name)
            ->assertJsonPath('data.product_units.0.selling_price', '4000.0000')
            ->assertJsonPath('data.stock_summary.total_on_hand', '10.000000');

        $this->assertDatabaseHas('products', ['store_id' => $store->id, 'name' => 'Teh Botol']);
        $this->assertDatabaseHas('product_units', ['store_id' => $store->id, 'sku' => 'SKU-API-001', 'selling_price' => '4000.0000']);
    }

    public function test_cashier_without_product_write_is_forbidden(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $unit = Unit::factory()->for($store)->create(['name' => 'Pieces', 'symbol' => 'pcs']);

        $cashier = User::factory()->create();
        $this->attach($store, $cashier, MembershipRole::Cashier);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson(
            "/api/v1/stores/{$store->public_id}/products",
            $this->mutationPayload($category, $unit),
        )->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');

        $this->assertDatabaseCount('products', 0);
    }

    public function test_update_changes_product_name(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $unit = Unit::factory()->for($store)->create(['name' => 'Pieces', 'symbol' => 'pcs']);
        Sanctum::actingAs($owner, ['store.read', 'product.write']);

        $created = $this->postJson(
            "/api/v1/stores/{$store->public_id}/products",
            $this->mutationPayload($category, $unit),
        )->assertStatus(201)->json('data.public_id');

        $update = $this->mutationPayload($category, $unit, ['name' => 'Teh Botol Baru']);
        unset($update['idempotency_key']);

        $this->patchJson(
            "/api/v1/stores/{$store->public_id}/products/{$created}",
            $update,
        )->assertOk()->assertJsonPath('data.name', 'Teh Botol Baru');

        $this->assertDatabaseHas('products', ['store_id' => $store->id, 'public_id' => $created, 'name' => 'Teh Botol Baru']);
    }
}
