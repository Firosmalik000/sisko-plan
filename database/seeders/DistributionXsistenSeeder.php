<?php

namespace Database\Seeders;

use App\Enums\CatalogAvailabilityStatus;
use App\Enums\DistributionPartnerStatus;
use App\Enums\PromotionCampaignStatus;
use App\Models\DistributionCatalogItem;
use App\Models\DistributionPartner;
use App\Models\PromotionCampaign;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder katalog distribusi awal: XSISTEN sebagai partner pertama + beberapa
 * item katalog + satu kampanye promosi (design §11, Req 20.4).
 *
 * Idempotent (updateOrCreate berbasis kunci stabil) sehingga aman dijalankan
 * ulang. Uang string decimal scale 4 (harga indikatif, Req 20.6).
 */
class DistributionXsistenSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $partner = DistributionPartner::query()->updateOrCreate(
                ['name' => 'XSISTEN'],
                [
                    'legal_name' => 'PT XSISTEN Distribusi Nusantara',
                    'logo_url' => 'https://cdn.xsisten.com/brand/xsisten-logo.png',
                    'contact' => [
                        'email' => 'distribusi@xsisten.com',
                        'phone' => '+622150001000',
                        'cta_url' => 'https://xsisten.com/distribusi',
                    ],
                    'status' => DistributionPartnerStatus::Active,
                    'service_markets' => ['ID', 'MY'],
                    'disclosure_label' => 'Disponsori XSISTEN',
                ],
            );

            $items = [
                [
                    'partner_sku' => 'XS-KOPI-01',
                    'name' => 'Kopi Robusta Premium 1kg',
                    'description' => 'Biji kopi robusta pilihan untuk kedai dan toko kelontong.',
                    'sales_unit' => 'carton',
                    'min_quantity' => '5',
                    'indicative_price_amount' => '135000.0000',
                    'markets' => ['ID'],
                ],
                [
                    'partner_sku' => 'XS-GULA-02',
                    'name' => 'Gula Pasir Kristal 50kg',
                    'description' => 'Gula pasir grade A kemasan grosir.',
                    'sales_unit' => 'sack',
                    'min_quantity' => '2',
                    'indicative_price_amount' => '620000.0000',
                    'markets' => ['ID', 'MY'],
                ],
                [
                    'partner_sku' => 'XS-MINYAK-03',
                    'name' => 'Minyak Goreng 18L',
                    'description' => 'Minyak goreng jerigen untuk restoran dan warung.',
                    'sales_unit' => 'jerrycan',
                    'min_quantity' => '3',
                    'indicative_price_amount' => '285000.0000',
                    'markets' => ['MY'],
                ],
            ];

            $seededItems = [];
            foreach ($items as $item) {
                $seededItems[$item['partner_sku']] = DistributionCatalogItem::query()->updateOrCreate(
                    ['partner_id' => $partner->id, 'partner_sku' => $item['partner_sku']],
                    [
                        'name' => $item['name'],
                        'description' => $item['description'],
                        'image_url' => 'https://cdn.xsisten.com/catalog/'.strtolower($item['partner_sku']).'.jpg',
                        'sales_unit' => $item['sales_unit'],
                        'min_quantity' => $item['min_quantity'],
                        'indicative_price_amount' => $item['indicative_price_amount'],
                        'currency_code' => in_array('ID', $item['markets'], true) ? 'IDR' : 'MYR',
                        'availability_status' => CatalogAvailabilityStatus::Available,
                        'market_targeting' => $item['markets'],
                        'valid_from' => now()->subDay(),
                        'valid_until' => now()->addMonths(3),
                        'revision' => 1,
                    ],
                );
            }

            $featured = $seededItems['XS-KOPI-01'];
            PromotionCampaign::query()->updateOrCreate(
                ['partner_id' => $partner->id, 'catalog_item_id' => $featured->id],
                [
                    'allowed_placements' => ['catalog_list', 'catalog_detail'],
                    'localized_copy' => [
                        'id' => ['headline' => 'Promo Kopi Robusta XSISTEN'],
                        'en' => ['headline' => 'XSISTEN Robusta Coffee Promo'],
                    ],
                    'active_from' => now()->subDay(),
                    'active_until' => now()->addMonth(),
                    'market_targeting' => ['ID'],
                    'disclosure_label' => 'Disponsori XSISTEN',
                    'priority' => 100,
                    'status' => PromotionCampaignStatus::Active,
                ],
            );
        });
    }
}
