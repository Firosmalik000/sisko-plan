<?php

namespace Tests\Feature;

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
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

    public function test_business_actor_migration_recovers_from_a_partially_added_actor_column(): void
    {
        foreach ($this->migrationFilesThrough('2026_09_16_020000_move_subscriptions_to_businesses.php') as $migrationFile) {
            (require $migrationFile)->up();
        }

        Schema::table('stock_adjustments', function (Blueprint $table): void {
            $table->foreignId('created_by_business_membership_id')->nullable();
            $table->foreign('created_by_business_membership_id', 'stock_adjustments_created_by_member_fk')
                ->references('id')->on('business_memberships')->restrictOnDelete();
        });

        $migration = require database_path('migrations/2026_09_16_030000_add_business_membership_actors.php');

        $migration->up();
        $migration->up();

        foreach ([
            'stock_adjustments', 'account_transfers', 'capital_transactions', 'cash_transactions',
            'stock_movements', 'purchases', 'purchase_payments', 'supplier_payable_transactions',
            'sales', 'sale_payments', 'sale_returns', 'expenses',
        ] as $tableName) {
            $this->assertTrue(Schema::hasColumn($tableName, 'created_by_business_membership_id'));
            $this->assertTrue(Schema::hasForeignKey($tableName, ['created_by_business_membership_id']));
        }

        foreach (['created', 'completed', 'posted', 'cancelled'] as $verb) {
            $column = "{$verb}_by_business_membership_id";
            $this->assertTrue(Schema::hasColumn('stock_counts', $column));
            $this->assertTrue(Schema::hasForeignKey('stock_counts', [$column]));
        }

        $this->assertTrue(Schema::hasColumn('sales', 'cashier_name'));
        $this->assertTrue(Schema::hasColumn('audit_logs', 'actor_business_membership_id'));
        $this->assertTrue(Schema::hasForeignKey('audit_logs', ['actor_business_membership_id']));
    }

    public function test_business_actor_migration_preserves_a_historical_actor_without_granting_access(): void
    {
        foreach ($this->migrationFilesThrough('2026_09_16_020000_move_subscriptions_to_businesses.php') as $migrationFile) {
            (require $migrationFile)->up();
        }

        $owner = User::factory()->create(['name' => 'Current Owner']);
        $historicalActor = User::factory()->create(['name' => 'Former Cashier']);
        $businessId = DB::table('businesses')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'name' => 'Historical Business',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $storeId = DB::table('stores')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'business_id' => $businessId,
            'owner_user_id' => $owner->id,
            'name' => 'Historical Store',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $accountId = DB::table('financial_accounts')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'store_id' => $storeId,
            'name' => 'Cash',
            'type' => 'cash',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $transactionId = DB::table('cash_transactions')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'store_id' => $storeId,
            'financial_account_id' => $accountId,
            'direction' => 'in',
            'reason' => 'opening_balance',
            'amount' => 100,
            'balance_after' => 100,
            'occurred_at' => now(),
            'created_by_user_id' => $historicalActor->id,
            'created_at' => now(),
        ]);

        $migration = require database_path('migrations/2026_09_16_030000_add_business_membership_actors.php');

        $migration->up();
        $migration->up();

        $membership = DB::table('business_memberships')->where([
            'business_id' => $businessId,
            'user_id' => $historicalActor->id,
        ])->first();
        $this->assertNotNull($membership);
        $this->assertSame(BusinessRole::Staff->value, $membership->business_role);
        $this->assertSame(MembershipStatus::Suspended->value, $membership->status);
        $this->assertDatabaseCount('business_memberships', 1);
        $this->assertDatabaseHas('cash_transactions', [
            'id' => $transactionId,
            'created_by_business_membership_id' => $membership->id,
        ]);
        $this->assertDatabaseMissing('store_memberships', [
            'store_id' => $storeId,
            'business_membership_id' => $membership->id,
        ]);
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
