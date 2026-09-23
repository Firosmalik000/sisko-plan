<?php

namespace Tests\Feature;

use App\Enums\BusinessRole;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
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

        $user = User::factory()->create(['name' => 'Legacy Account Without Store']);
        $planId = DB::table('plans')->where('code', 'starter-default')->value('id');
        $subscriptionId = DB::table('subscriptions')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'user_id' => $user->id,
            'store_id' => null,
            'plan_id' => $planId,
            'status' => 'active',
            'starts_at' => now(),
            'current_period_start' => now()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $periodId = DB::table('subscription_periods')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'subscription_id' => $subscriptionId,
            'user_id' => $user->id,
            'plan_id' => $planId,
            'plan_name' => 'Gratis Selamanya',
            'monthly_price' => 0,
            'duration_months' => 1,
            'was_trial' => false,
            'period_start' => now()->toDateString(),
            'source' => 'account_free_backfill',
            'activated_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

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

        $businessId = DB::table('business_memberships')->where([
            'user_id' => $user->id,
            'business_role' => BusinessRole::Owner->value,
        ])->value('business_id');
        $this->assertNotNull($businessId);
        $this->assertDatabaseHas('businesses', ['id' => $businessId, 'name' => 'Legacy Account Without Store']);
        $this->assertDatabaseHas('subscriptions', ['id' => $subscriptionId, 'business_id' => $businessId]);
        $this->assertDatabaseHas('subscription_periods', ['id' => $periodId, 'business_id' => $businessId]);
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
