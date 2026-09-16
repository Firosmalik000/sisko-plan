<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var list<string> */
    private array $createdTables = [
        'stock_adjustments', 'account_transfers', 'capital_transactions', 'cash_transactions',
        'stock_movements', 'purchases', 'purchase_payments', 'supplier_payable_transactions',
        'sales', 'sale_payments', 'sale_returns', 'expenses',
    ];

    /** @var array<string, string> */
    private array $stockCountColumns = [
        'created_by_user_id' => 'created_by_business_membership_id',
        'completed_by_user_id' => 'completed_by_business_membership_id',
        'posted_by_user_id' => 'posted_by_business_membership_id',
        'cancelled_by_user_id' => 'cancelled_by_business_membership_id',
    ];

    public function up(): void
    {
        foreach ($this->createdTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                $table->foreignId('created_by_user_id')->nullable()->change();
                $table->foreignId('created_by_business_membership_id')->nullable();
                $table->foreign('created_by_business_membership_id', "{$tableName}_created_by_member_fk")
                    ->references('id')->on('business_memberships')->restrictOnDelete();
            });
        }
        Schema::table('stock_counts', function (Blueprint $table): void {
            $table->foreignId('created_by_user_id')->nullable()->change();
            foreach (['created', 'completed', 'posted', 'cancelled'] as $verb) {
                $column = "{$verb}_by_business_membership_id";
                $table->foreignId($column)->nullable();
                $table->foreign($column, "stock_counts_{$verb}_by_member_fk")
                    ->references('id')->on('business_memberships')->restrictOnDelete();
            }
        });
        Schema::table('sales', function (Blueprint $table): void {
            $table->string('cashier_name', 120)->nullable()->after('external_order_number');
        });
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->foreignId('actor_business_membership_id')->nullable();
            $table->foreign('actor_business_membership_id', 'audit_logs_actor_member_fk')
                ->references('id')->on('business_memberships')->restrictOnDelete();
        });

        foreach ($this->createdTables as $tableName) {
            $this->backfill($tableName, 'created_by_user_id', 'created_by_business_membership_id');
        }
        foreach ($this->stockCountColumns as $userColumn => $membershipColumn) {
            $this->backfill('stock_counts', $userColumn, $membershipColumn);
        }
        $this->backfillAudits();

        DB::table('sales')->whereNotNull('created_by_business_membership_id')->orderBy('id')
            ->eachById(function (object $sale): void {
                $name = DB::table('business_memberships')->where('id', $sale->created_by_business_membership_id)->value('display_name');
                DB::table('sales')->where('id', $sale->id)->update(['cashier_name' => $name]);
            });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropForeign('audit_logs_actor_member_fk');
            $table->dropColumn('actor_business_membership_id');
        });
        Schema::table('sales', fn (Blueprint $table) => $table->dropColumn('cashier_name'));
        Schema::table('stock_counts', function (Blueprint $table): void {
            foreach (['created', 'completed', 'posted', 'cancelled'] as $verb) {
                $table->dropForeign("stock_counts_{$verb}_by_member_fk");
                $table->dropColumn("{$verb}_by_business_membership_id");
            }
        });
        foreach (array_reverse($this->createdTables) as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                $table->dropForeign("{$tableName}_created_by_member_fk");
                $table->dropColumn('created_by_business_membership_id');
            });
        }
    }

    private function backfill(string $tableName, string $userColumn, string $membershipColumn): void
    {
        DB::table($tableName)->whereNotNull($userColumn)->whereNull($membershipColumn)->orderBy('id')
            ->eachById(function (object $row) use ($tableName, $userColumn, $membershipColumn): void {
                $businessId = DB::table('stores')->where('id', $row->store_id)->value('business_id');
                $membershipId = DB::table('business_memberships')
                    ->where('business_id', $businessId)->where('user_id', $row->{$userColumn})->value('id');
                if ($membershipId === null) {
                    throw new RuntimeException("{$tableName} actor [{$row->{$userColumn}}] has no Business Membership for Store [{$row->store_id}].");
                }
                DB::table($tableName)->where('id', $row->id)->update([$membershipColumn => $membershipId]);
            });
    }

    private function backfillAudits(): void
    {
        DB::table('audit_logs')->whereNotNull('store_id')->where('actor_type', 'App\\Models\\User')
            ->whereNull('actor_business_membership_id')->orderBy('id')->eachById(function (object $audit): void {
                $businessId = DB::table('stores')->where('id', $audit->store_id)->value('business_id');
                $membershipId = DB::table('business_memberships')->where('business_id', $businessId)
                    ->where('user_id', $audit->actor_id)->value('id');
                if ($membershipId === null) {
                    throw new RuntimeException("Audit [{$audit->id}] has no Business Membership actor.");
                }
                DB::table('audit_logs')->where('id', $audit->id)->update(['actor_business_membership_id' => $membershipId]);
            });
    }
};
