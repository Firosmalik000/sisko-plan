<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $free = Plan::query()->updateOrCreate(
                ['code' => 'starter-default'],
                [
                    'name' => 'Gratis Selamanya',
                    'description' => 'Paket dasar untuk memulai operasional toko.',
                    'kind' => Plan::KIND_BASE,
                    'billing_cycle' => Plan::BILLING_LIFETIME,
                    'monthly_price' => '0',
                    'duration_months' => 1,
                    'max_stores' => 1,
                    'max_products' => 1000,
                    'max_members' => 1,
                    'max_scans' => 100,
                    'is_trial' => false,
                    'is_default' => true,
                    'is_active' => true,
                ],
            );

            Plan::query()->whereKeyNot($free->id)->where('is_trial', true)->update(['is_trial' => false, 'is_active' => false]);
            Plan::query()->whereKeyNot($free->id)->where('is_default', true)->update(['is_default' => false]);

            foreach ($this->addonOffers() as $offer) {
                Plan::query()->firstOrCreate(['code' => $offer['code']], $offer);
            }
        });
    }

    /** @return array<int, array<string, int|string|bool|null>> */
    private function addonOffers(): array
    {
        return [
            [
                'code' => 'addon-store-1', 'name' => 'Tambah 1 Toko',
                'description' => 'Tambahan kapasitas satu toko selama satu bulan.',
                'kind' => Plan::KIND_ADDON, 'billing_cycle' => Plan::BILLING_FIXED,
                'offer_category' => Plan::CATEGORY_STORE,
                'monthly_price' => '0', 'duration_months' => 1,
                'max_stores' => 1, 'max_products' => 0, 'max_members' => 0, 'max_scans' => 0,
                'is_default' => false, 'is_trial' => false, 'is_active' => false,
            ],
            [
                'code' => 'addon-staff-1', 'name' => 'Tambah 1 Staf',
                'description' => 'Tambahan kapasitas satu staf selama satu bulan.',
                'kind' => Plan::KIND_ADDON, 'billing_cycle' => Plan::BILLING_FIXED,
                'offer_category' => Plan::CATEGORY_STAFF,
                'monthly_price' => '0', 'duration_months' => 1,
                'max_stores' => 0, 'max_products' => 0, 'max_members' => 1, 'max_scans' => 0,
                'is_default' => false, 'is_trial' => false, 'is_active' => false,
            ],
            [
                'code' => 'addon-scan-100', 'name' => 'Tambah 100 Scan',
                'description' => 'Tambahan kuota 100 scan selama satu bulan.',
                'kind' => Plan::KIND_ADDON, 'billing_cycle' => Plan::BILLING_FIXED,
                'offer_category' => Plan::CATEGORY_SCAN,
                'monthly_price' => '0', 'duration_months' => 1,
                'max_stores' => 0, 'max_products' => 0, 'max_members' => 0, 'max_scans' => 100,
                'is_default' => false, 'is_trial' => false, 'is_active' => false,
            ],
        ];
    }
}
