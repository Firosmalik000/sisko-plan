<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BusinessSubscriptionMigrationRecoveryTest extends TestCase
{
    public function test_business_subscription_migration_recovers_from_a_partially_added_business_column(): void
    {
        foreach ($this->migrationFilesThrough('2026_09_16_010000_backfill_business_tenancy.php') as $migrationFile) {
            (require $migrationFile)->up();
        }

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->foreignId('business_id')->nullable()->constrained()->restrictOnDelete();
        });

        $migration = require database_path('migrations/2026_09_16_020000_move_subscriptions_to_businesses.php');

        $migration->up();
        $migration->up();

        foreach ([
            'subscriptions',
            'subscription_periods',
            'subscription_addons',
            'subscription_payments',
            'subscription_scan_usages',
            'subscription_scan_events',
        ] as $tableName) {
            $this->assertTrue(Schema::hasColumn($tableName, 'business_id'));
            $this->assertTrue(Schema::hasForeignKey($tableName, ['business_id']));
        }

        $this->assertTrue(Schema::hasColumn('subscription_payments', 'purchaser_user_id'));
        $this->assertTrue(Schema::hasForeignKey('subscription_payments', ['purchaser_user_id']));
        $this->assertTrue(Schema::hasIndex('subscriptions', ['business_id'], 'unique'));
        $this->assertTrue(Schema::hasIndex('subscription_scan_usages', ['business_id', 'period_start'], 'unique'));
        $this->assertTrue(Schema::hasIndex('subscription_scan_events', ['business_id', 'request_key'], 'unique'));
    }

    /** @return list<string> */
    private function migrationFilesThrough(string $lastMigration): array
    {
        $files = glob(database_path('migrations/*.php')) ?: [];
        sort($files);

        return array_values(array_filter(
            $files,
            fn (string $file): bool => basename($file) <= $lastMigration,
        ));
    }
}
