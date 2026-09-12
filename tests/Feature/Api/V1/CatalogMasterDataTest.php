<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Category;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * CRUD Catalog kategori & unit Api/V1 (Req 9, 10): cursor+q, permission matrix
 * (cashier baca-saja), tenant isolation, soft-deactivate menjaga referensi.
 */
class CatalogMasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    private function ownerOf(Store $store): User
    {
        return User::find($store->owner_user_id);
    }

    private function cashierOf(Store $store): User
    {
        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value],
        ]);

        return $cashier;
    }

    // ---- Categories ----

    public function test_owner_can_create_list_update_and_deactivate_category(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'catalog.write']);

        $created = $this->postJson("/api/v1/stores/{$store->public_id}/categories", [
            'name' => 'Minuman',
        ])->assertStatus(201)->assertJsonPath('data.is_active', true);

        $publicId = $created->json('data.public_id');
        $this->assertIsString($publicId);
        $this->assertArrayNotHasKey('id', $created->json('data'));

        $this->getJson("/api/v1/stores/{$store->public_id}/categories?q=Min")
            ->assertOk()
            ->assertJsonPath('data.categories.0.name', 'Minuman');

        $this->patchJson("/api/v1/stores/{$store->public_id}/categories/{$publicId}", [
            'name' => 'Minuman Dingin',
        ])->assertOk()->assertJsonPath('data.name', 'Minuman Dingin');

        // DELETE = soft-deactivate, baris tetap ada (Req 9.3).
        $this->deleteJson("/api/v1/stores/{$store->public_id}/categories/{$publicId}")
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertDatabaseHas('categories', ['public_id' => $publicId, 'is_active' => false]);
    }

    public function test_cashier_cannot_mutate_category(): void
    {
        $store = Store::factory()->create();
        $cashier = $this->cashierOf($store);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson("/api/v1/stores/{$store->public_id}/categories", ['name' => 'X'])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_category_list_is_tenant_isolated(): void
    {
        $store = Store::factory()->create();
        $other = Store::factory()->create();
        Category::factory()->create(['store_id' => $other->id, 'name' => 'Rahasia']);
        Category::factory()->create(['store_id' => $store->id, 'name' => 'Punyaku']);

        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'catalog.write']);

        $names = array_column(
            $this->getJson("/api/v1/stores/{$store->public_id}/categories")->json('data.categories'),
            'name'
        );
        $this->assertContains('Punyaku', $names);
        $this->assertNotContains('Rahasia', $names);
    }

    // ---- Units ----

    public function test_owner_can_crud_unit(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'catalog.write']);

        $created = $this->postJson("/api/v1/stores/{$store->public_id}/units", [
            'name' => 'Botol',
            'symbol' => 'btl',
            'unit_type' => 'retail',
        ])->assertStatus(201)
            ->assertJsonPath('data.unit_type', 'retail')
            ->assertJsonPath('data.symbol', 'btl');

        $publicId = $created->json('data.public_id');

        $this->deleteJson("/api/v1/stores/{$store->public_id}/units/{$publicId}")
            ->assertOk()->assertJsonPath('data.is_active', false);
    }

    public function test_unit_rejects_invalid_type(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'catalog.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/units", [
            'name' => 'Aneh',
            'unit_type' => 'invalid',
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }
}
