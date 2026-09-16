<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\Marketplace;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CountryMarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        $marketplaces = [
            'shopee' => 'Shopee', 'tokopedia' => 'Tokopedia', 'tiktok_shop' => 'TikTok Shop',
            'lazada' => 'Lazada', 'blibli' => 'Blibli', 'tiki' => 'Tiki', 'other' => 'Other',
        ];
        foreach ($marketplaces as $code => $label) {
            Marketplace::query()->firstOrCreate(['code' => $code], ['label' => $label, 'is_active' => true]);
        }

        $countries = [
            'BN' => ['other'], 'KH' => ['other'],
            'ID' => ['shopee', 'tokopedia', 'tiktok_shop', 'blibli', 'lazada', 'other'],
            'LA' => ['other'],
            'MY' => ['shopee', 'lazada', 'tiktok_shop', 'other'],
            'MM' => ['other'],
            'PH' => ['shopee', 'lazada', 'tiktok_shop', 'other'],
            'SG' => ['shopee', 'lazada', 'tiktok_shop', 'other'],
            'TH' => ['shopee', 'lazada', 'tiktok_shop', 'other'],
            'TL' => ['other'],
            'VN' => ['shopee', 'lazada', 'tiktok_shop', 'tiki', 'other'],
        ];
        foreach ($countries as $countryCode => $codes) {
            $countryId = Country::query()->where('code', $countryCode)->valueOrFail('id');
            foreach ($codes as $priority => $code) {
                DB::table('country_marketplace')->insertOrIgnore([
                    'country_id' => $countryId,
                    'marketplace_id' => Marketplace::query()->where('code', $code)->valueOrFail('id'),
                    'priority' => $priority,
                    'is_enabled' => true,
                ]);
            }
        }
    }
}
