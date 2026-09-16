<?php

namespace Tests\Feature;

use App\Models\Country;
use App\Models\Marketplace;
use App\Models\Store;
use App\Models\User;
use App\Services\Commerce\CountryCommerceCatalog;
use Database\Seeders\CountryMarketplaceSeeder;
use Database\Seeders\CountryPaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CountryCommerceCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_southeast_asian_country_has_its_local_payment_catalog(): void
    {
        $this->seed([CountryPaymentMethodSeeder::class, CountryMarketplaceSeeder::class]);
        $catalog = app(CountryCommerceCatalog::class);

        $expectedQr = [
            'BN' => 'tarus_qr', 'KH' => 'khqr', 'ID' => 'qris', 'LA' => 'lao_qr',
            'MY' => 'duitnow_qr', 'MM' => 'mmqr', 'PH' => 'qr_ph', 'SG' => 'paynow_sgqr',
            'TH' => 'promptpay_qr', 'TL' => 'tuqr', 'VN' => 'vietqr',
        ];
        foreach ($expectedQr as $countryCode => $paymentCode) {
            $country = Country::query()->where('code', $countryCode)->sole();
            $this->assertSame($paymentCode, $catalog->paymentMethods($country)->firstWhere('kind', 'national_qr')?->code);
        }

        $this->assertSame(['shopee', 'tokopedia', 'tiktok_shop', 'blibli', 'lazada', 'other'], $catalog->marketplacesForCountry('ID')->pluck('code')->all());
        $this->assertSame(['other'], $catalog->marketplacesForCountry('BN')->pluck('code')->all());
    }

    public function test_reseeding_does_not_reenable_platform_disabled_commerce_references(): void
    {
        $this->seed([CountryPaymentMethodSeeder::class, CountryMarketplaceSeeder::class]);
        $country = Country::query()->where('code', 'ID')->sole();
        $shopee = Marketplace::query()->where('code', 'shopee')->sole();
        $country->marketplaces()->updateExistingPivot($shopee->id, ['is_enabled' => false]);
        $shopee->update(['is_active' => false]);

        $this->seed([CountryPaymentMethodSeeder::class, CountryMarketplaceSeeder::class]);

        $this->assertFalse($shopee->fresh()->is_active);
        $this->assertFalse((bool) $country->marketplaces()->whereKey($shopee->id)->firstOrFail()->pivot->is_enabled);
    }

    public function test_store_preferences_and_disabled_references_are_enforced_without_cross_store_leakage(): void
    {
        $owner = User::factory()->create();
        $first = Store::factory()->ownedBy($owner)->create();
        $second = Store::factory()->ownedBy($owner)->create();
        $shopee = Marketplace::query()->where('code', 'shopee')->sole();
        $first->marketplaces()->attach($shopee, ['is_enabled' => false]);

        $catalog = app(CountryCommerceCatalog::class);
        $this->assertNotContains('shopee', $catalog->marketplaces($first)->pluck('code'));
        $this->assertContains('shopee', $catalog->marketplaces($second)->pluck('code'));

        $shopee->update(['is_active' => false]);
        $this->assertNotContains('shopee', $catalog->marketplaces($second)->pluck('code'));
    }
}
