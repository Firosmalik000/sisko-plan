<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var list<string> */
    private array $subscriptionTables = [
        'subscriptions',
        'subscription_periods',
        'subscription_addons',
        'subscription_payments',
        'subscription_scan_usages',
        'subscription_scan_events',
    ];

    /** @var list<string> */
    private array $operationalTables = [
        'stock_adjustments',
        'account_transfers',
        'capital_transactions',
        'cash_transactions',
        'stock_movements',
        'purchases',
        'purchase_payments',
        'supplier_payable_transactions',
        'sales',
        'sale_payments',
        'sale_returns',
        'expenses',
    ];

    public function up(): void
    {
        $this->assertCompleteBackfill();

        Schema::table('stores', function (Blueprint $table): void {
            $table->dropForeign(['owner_user_id']);
            $table->dropIndex('stores_owner_user_id_created_at_index');
            $table->dropColumn('owner_user_id');
            $table->unsignedBigInteger('business_id')->nullable(false)->change();
        });
        $storeUserForeign = DB::getDriverName() === 'sqlite' ? ['user_id'] : 'store_user_user_id_foreign';
        Schema::table('store_memberships', function (Blueprint $table) use ($storeUserForeign): void {
            $table->dropForeign($storeUserForeign);
            $table->dropUnique('store_user_store_id_user_id_unique');
            $table->dropIndex('store_user_user_id_status_index');
            $table->dropColumn('user_id');
            $table->unsignedBigInteger('business_membership_id')->nullable(false)->change();
        });

        foreach ($this->subscriptionTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                $table->dropForeign(['user_id']);
                if ($tableName === 'subscription_periods') {
                    $table->dropIndex('subscription_periods_user_id_activated_at_period_start_index');
                    $table->dropIndex('subscription_periods_user_id_period_start_index');
                } elseif ($tableName === 'subscription_addons') {
                    $table->dropIndex('subscription_addons_user_id_starts_on_ends_on_index');
                } elseif ($tableName === 'subscription_payments') {
                    $table->dropIndex('subscription_payments_user_id_paid_at_index');
                }
                $table->dropColumn('user_id');
                $table->unsignedBigInteger('business_id')->nullable(false)->change();
            });
        }

        foreach ($this->operationalTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropForeign(['created_by_user_id']);
                $table->dropColumn('created_by_user_id');
                $table->unsignedBigInteger('created_by_business_membership_id')->nullable(false)->change();
            });
        }

        Schema::table('stock_counts', function (Blueprint $table): void {
            foreach (['created', 'completed', 'posted', 'cancelled'] as $verb) {
                $column = "{$verb}_by_user_id";
                $table->dropForeign([$column]);
                $table->dropColumn($column);
            }
            $table->unsignedBigInteger('created_by_business_membership_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('stock_counts', function (Blueprint $table): void {
            foreach (['created', 'completed', 'posted', 'cancelled'] as $verb) {
                $column = "{$verb}_by_user_id";
                $table->foreignId($column)->nullable()->constrained('users')->restrictOnDelete();
            }
        });

        foreach (array_reverse($this->operationalTables) as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->foreignId('created_by_user_id')->nullable()->constrained('users')->restrictOnDelete());
        }
        foreach (array_reverse($this->subscriptionTables) as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->foreignId('user_id')->nullable()->constrained('users')->restrictOnDelete());
        }
        Schema::table('store_memberships', fn (Blueprint $table) => $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete());
        Schema::table('stores', fn (Blueprint $table) => $table->foreignId('owner_user_id')->nullable()->constrained('users')->restrictOnDelete());

        $this->restoreLegacyActorSnapshots();
    }

    private function assertCompleteBackfill(): void
    {
        $this->assertNoNulls('stores', 'business_id');
        $this->assertNoNulls('store_memberships', 'business_membership_id');
        foreach ($this->subscriptionTables as $tableName) {
            $this->assertNoNulls($tableName, 'business_id');
        }
        foreach ($this->operationalTables as $tableName) {
            $this->assertNoNulls($tableName, 'created_by_business_membership_id');
        }
        $this->assertNoNulls('stock_counts', 'created_by_business_membership_id');
        foreach (['completed', 'posted', 'cancelled'] as $verb) {
            $missing = DB::table('stock_counts')
                ->whereNotNull("{$verb}_by_user_id")
                ->whereNull("{$verb}_by_business_membership_id")
                ->exists();
            if ($missing) {
                throw new RuntimeException("stock_counts.{$verb}_by_business_membership_id backfill is incomplete.");
            }
        }
    }

    private function assertNoNulls(string $tableName, string $column): void
    {
        if (DB::table($tableName)->whereNull($column)->exists()) {
            throw new RuntimeException("{$tableName}.{$column} backfill is incomplete.");
        }
    }

    private function restoreLegacyActorSnapshots(): void
    {
        DB::table('stores')->orderBy('id')->eachById(function (object $store): void {
            $ownerId = DB::table('business_memberships')->where('business_id', $store->business_id)
                ->where('business_role', 'owner')->whereNotNull('user_id')->oldest('id')->value('user_id');
            DB::table('stores')->where('id', $store->id)->update(['owner_user_id' => $ownerId]);
        });
        DB::table('store_memberships')->orderBy('id')->eachById(function (object $assignment): void {
            $userId = DB::table('business_memberships')->where('id', $assignment->business_membership_id)->value('user_id');
            DB::table('store_memberships')->where('id', $assignment->id)->update(['user_id' => $userId]);
        });
        foreach ($this->subscriptionTables as $tableName) {
            DB::table($tableName)->orderBy('id')->eachById(function (object $row) use ($tableName): void {
                $userId = DB::table('business_memberships')->where('business_id', $row->business_id)
                    ->where('business_role', 'owner')->whereNotNull('user_id')->oldest('id')->value('user_id');
                DB::table($tableName)->where('id', $row->id)->update(['user_id' => $userId]);
            });
        }
        foreach ($this->operationalTables as $tableName) {
            DB::table($tableName)->orderBy('id')->eachById(function (object $row) use ($tableName): void {
                $userId = DB::table('business_memberships')->where('id', $row->created_by_business_membership_id)->value('user_id');
                DB::table($tableName)->where('id', $row->id)->update(['created_by_user_id' => $userId]);
            });
        }
    }
};
