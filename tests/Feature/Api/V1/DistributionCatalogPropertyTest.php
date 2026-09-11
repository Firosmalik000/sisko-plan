<?php

namespace Tests\Feature\Api\V1;

use App\Models\DistributionCatalogItem;
use App\Models\DistributionPartner;
use App\Models\PromotionCampaign;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Property-based test katalog distribusi (design Correctness Properties).
 *
 * Feature: xsisten, Property 30: Katalog distribusi market-aware & berlabel —
 * item hanya muncul untuk market yang ditarget + dalam valid window; sponsored
 * berlabel disclosure yang dapat dibaca; response tidak memuat aksi beli.
 *
 * Loop atas beberapa market dengan input acak berseed agar deterministik.
 */
class DistributionCatalogPropertyTest extends TestCase
{
    use RefreshDatabase;

    private const ITERATIONS = 40;

    private const MARKETS = ['ID', 'MY', 'TH', 'VN'];

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
        mt_srand(20260914);
    }

    /**
     * Property 30: item hanya visible untuk market yang ditarget + valid window,
     * sponsored berlabel, tanpa tombol beli — untuk tiap market.
     */
    public function test_property_30_catalog_market_aware_and_labeled(): void
    {
        $partner = DistributionPartner::factory()->create(['disclosure_label' => 'Disponsori']);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        for ($i = 0; $i < self::ITERATIONS; $i++) {
            DistributionCatalogItem::query()->delete();

            $targetMarket = self::MARKETS[mt_rand(0, count(self::MARKETS) - 1)];

            $expectedVisible = [];
            $expectedSponsored = [];

            // Buat sejumlah item acak: sebagian target market, sebagian tidak,
            // sebagian di luar valid window; sebagian sponsored.
            $count = mt_rand(3, 8);
            for ($n = 0; $n < $count; $n++) {
                $inMarket = mt_rand(0, 1) === 1;
                $inWindow = mt_rand(0, 1) === 1;

                $markets = $inMarket
                    ? [$targetMarket]
                    : [self::otherMarket($targetMarket)];

                $validFrom = $inWindow ? now()->subDay() : now()->addWeek();
                $validUntil = $inWindow ? now()->addMonth() : now()->addMonths(2);

                $item = DistributionCatalogItem::factory()->for($partner, 'partner')
                    ->markets($markets)
                    ->create(['valid_from' => $validFrom, 'valid_until' => $validUntil]);

                $visible = $inMarket && $inWindow;
                if ($visible) {
                    $expectedVisible[] = $item->public_id;

                    // Sebagian item visible diberi kampanye sponsor aktif di market ini.
                    if (mt_rand(0, 1) === 1) {
                        PromotionCampaign::factory()->for($partner, 'partner')->create([
                            'catalog_item_id' => $item->id,
                            'market_targeting' => [$targetMarket],
                            'active_from' => now()->subDay(),
                            'active_until' => now()->addMonth(),
                            'disclosure_label' => 'Disponsori',
                        ]);
                        $expectedSponsored[$item->public_id] = 'Disponsori';
                    }
                }
            }

            $response = $this->getJson("/api/v1/distribution/catalog?market={$targetMarket}&limit=100")->assertOk();
            $items = collect($response->json('data.items'));

            $returnedIds = $items->pluck('public_id')->all();
            sort($returnedIds);
            sort($expectedVisible);

            // Hanya item yang ditarget market ini + dalam valid window yang muncul.
            $this->assertSame($expectedVisible, $returnedIds, "Iterasi {$i} market {$targetMarket}: visibility mismatch");

            foreach ($items as $entry) {
                // Uang berupa string decimal (bukan float).
                $this->assertIsString($entry['indicative_price']);
                $this->assertSame('indikatif', $entry['price_label']);

                // Sponsored → is_sponsored true + disclosure_label terisi.
                if (array_key_exists($entry['public_id'], $expectedSponsored)) {
                    $this->assertTrue($entry['is_sponsored']);
                    $this->assertNotNull($entry['disclosure_label']);
                    $this->assertNotSame('', $entry['disclosure_label']);
                } else {
                    $this->assertFalse($entry['is_sponsored']);
                    $this->assertNull($entry['disclosure_label']);
                }
            }

            // Response tidak memuat aksi beli/checkout.
            $raw = $response->getContent();
            foreach (['buy_url', 'checkout', 'add_to_cart', 'purchase', 'order_url'] as $forbidden) {
                $this->assertStringNotContainsStringIgnoringCase($forbidden, $raw);
            }
        }
    }

    private static function otherMarket(string $market): string
    {
        $others = array_values(array_filter(self::MARKETS, fn (string $m): bool => $m !== $market));

        return $others[mt_rand(0, count($others) - 1)];
    }
}
