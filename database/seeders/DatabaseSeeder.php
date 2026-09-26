<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PlanSeeder::class,
            CountryCurrencySeeder::class,
            CountryPaymentMethodSeeder::class,
            CountryMarketplaceSeeder::class,
            BusinessPermissionSeeder::class,
            CatalogReferenceSeeder::class,
            InitialBusinessSeeder::class,
        ]);
    }
}
