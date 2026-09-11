<?php

namespace Tests\Feature\Api\V1;

use App\Models\Country;
use App\Models\DistributionCatalogItem;
use App\Models\DistributionPartner;
use App\Models\PromotionCampaign;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak `GET /distribution/catalog` + `/{item}` — katalog distributor
 * market-aware READ-ONLY (design §3.2, §11, Req 20.1, 20.2, 20.4, 20.7, 20.8,
 * 20.9). Uang string decimal scale 4; sponsored berlabel; tanpa tombol beli.
 */
class DistributionCatalogTest extends TestCase
{
    use RefreshDatabase;

    private function partner(array $attrs = []): DistributionPartner
    {
        return DistributionPartner::factory()->create($attrs);
    }

    public function test_catalog_requires_authentication(): void
    {
        $this->getJson('/api/v1/distribution/catalog')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_catalog_returns_items_for_requested_market_with_indicative_price_string(): void
    {
        $partner = $this->partner();
        $item = DistributionCatalogItem::factory()->for($partner, 'partner')
            ->markets(['ID'])
            ->create(['name' => 'Kopi Robusta', 'indicative_price_amount' => '135000.0000', 'currency_code' => 'IDR']);

        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/v1/distribution/catalog?market=ID')
            ->assertOk()
            ->assertJsonPath('data.market', 'ID')
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.public_id', $item->public_id)
            ->assertJsonPath('data.items.0.indicative_price', '135000.0000')
            ->assertJsonPath('data.items.0.price_label', 'indikatif')
            ->assertJsonPath('data.items.0.currency_code', 'IDR')
            ->assertJsonPath('data.items.0.partner.public_id', $partner->public_id);

        // Uang & quantity harus string (bukan float).
        $this->assertIsString($response->json('data.items.0.indicative_price'));
        $this->assertIsString($response->json('data.items.0.min_quantity'));
    }

    public function test_catalog_hides_items_targeting_other_markets(): void
    {
        $partner = $this->partner();
        DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['MY'])->create();

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/distribution/catalog?market=ID')
            ->assertOk()
            ->assertJsonCount(0, 'data.items');
    }

    public function test_catalog_hides_items_outside_valid_window(): void
    {
        $partner = $this->partner();
        // Sudah kedaluwarsa.
        DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])
            ->create(['valid_from' => now()->subMonths(2), 'valid_until' => now()->subDay()]);
        // Belum mulai.
        DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])
            ->create(['valid_from' => now()->addWeek(), 'valid_until' => now()->addMonth()]);

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/distribution/catalog?market=ID')
            ->assertOk()
            ->assertJsonCount(0, 'data.items');
    }

    public function test_catalog_hides_unavailable_items(): void
    {
        $partner = $this->partner();
        DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->unavailable()->create();

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/distribution/catalog?market=ID')
            ->assertOk()
            ->assertJsonCount(0, 'data.items');
    }

    public function test_catalog_search_matches_name(): void
    {
        $partner = $this->partner();
        $match = DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->create(['name' => 'Gula Kristal']);
        DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->create(['name' => 'Kopi Bubuk']);

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/distribution/catalog?market=ID&q=Gula')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.public_id', $match->public_id);
    }

    public function test_sponsored_item_carries_disclosure_label(): void
    {
        $partner = $this->partner(['disclosure_label' => 'Disponsori']);
        $sponsored = DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->create();
        $plain = DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->create();

        PromotionCampaign::factory()->for($partner, 'partner')->create([
            'catalog_item_id' => $sponsored->id,
            'market_targeting' => ['ID'],
            'disclosure_label' => 'Disponsori XSISTEN',
        ]);

        Sanctum::actingAs(User::factory()->create());

        $items = collect($this->getJson('/api/v1/distribution/catalog?market=ID')->assertOk()->json('data.items'))
            ->keyBy('public_id');

        $this->assertTrue($items[$sponsored->public_id]['is_sponsored']);
        $this->assertSame('Disponsori XSISTEN', $items[$sponsored->public_id]['disclosure_label']);

        $this->assertFalse($items[$plain->public_id]['is_sponsored']);
        $this->assertNull($items[$plain->public_id]['disclosure_label']);
    }

    public function test_paused_or_out_of_market_campaign_does_not_sponsor(): void
    {
        $partner = $this->partner();
        $item = DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->create();

        // Kampanye di-pause → tidak sponsor.
        PromotionCampaign::factory()->for($partner, 'partner')->paused()->create([
            'catalog_item_id' => $item->id, 'market_targeting' => ['ID'],
        ]);
        // Kampanye market lain → tidak sponsor untuk ID.
        PromotionCampaign::factory()->for($partner, 'partner')->create([
            'catalog_item_id' => $item->id, 'market_targeting' => ['MY'],
        ]);

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/distribution/catalog?market=ID')
            ->assertOk()
            ->assertJsonPath('data.items.0.is_sponsored', false);
    }

    public function test_response_contains_no_buy_or_checkout_action(): void
    {
        $partner = $this->partner();
        DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->create();

        Sanctum::actingAs(User::factory()->create());

        $raw = $this->getJson('/api/v1/distribution/catalog?market=ID')->assertOk()->getContent();

        foreach (['buy_url', 'checkout', 'add_to_cart', 'purchase', 'order_url', '"buy"'] as $forbidden) {
            $this->assertStringNotContainsStringIgnoringCase($forbidden, $raw);
        }
    }

    public function test_market_defaults_to_active_store_country(): void
    {
        $owner = User::factory()->create();
        // Toko dengan negara MY.
        $myCountryId = Country::query()->where('code', 'MY')->value('id');
        Store::factory()->for($owner, 'owner')->create(['country_id' => $myCountryId]);

        $partner = $this->partner();
        $myItem = DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['MY'])->create();
        DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->create();

        Sanctum::actingAs($owner);

        // Tanpa ?market → default ke negara toko aktif (MY).
        $this->getJson('/api/v1/distribution/catalog')
            ->assertOk()
            ->assertJsonPath('data.market', 'MY')
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.public_id', $myItem->public_id);
    }

    public function test_show_returns_item_detail_for_market(): void
    {
        $partner = $this->partner();
        $item = DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['ID'])->create();

        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/v1/distribution/catalog/{$item->public_id}?market=ID")
            ->assertOk()
            ->assertJsonPath('data.item.public_id', $item->public_id)
            ->assertJsonPath('data.item.price_label', 'indikatif');
    }

    public function test_show_returns_404_for_item_outside_market(): void
    {
        $partner = $this->partner();
        $item = DistributionCatalogItem::factory()->for($partner, 'partner')->markets(['MY'])->create();

        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/v1/distribution/catalog/{$item->public_id}?market=ID")
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
