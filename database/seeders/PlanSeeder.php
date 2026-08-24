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
            $trial = Plan::query()->updateOrCreate(
                ['code' => 'starter-default'],
                [
                    'name' => 'Trial 30 Hari',
                    'description' => 'Coba seluruh alur operasional toko selama 30 hari.',
                    'monthly_price' => '0',
                    'duration_months' => 1,
                    'max_stores' => 3,
                    'max_products' => 1000,
                    'max_members' => 2,
                    'is_trial' => true,
                    'is_default' => true,
                    'is_active' => true,
                ],
            );

            Plan::query()->whereKeyNot($trial->id)->where('is_trial', true)->update(['is_trial' => false]);
            Plan::query()->whereKeyNot($trial->id)->where('is_default', true)->update(['is_default' => false]);
        });
    }
}
