<?php

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

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
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId('created_by_user_id')->nullable()->change();
            });

            $this->ensureMembershipActorColumn(
                $tableName,
                'created_by_business_membership_id',
                "{$tableName}_created_by_member_fk",
            );
        }
        Schema::table('stock_counts', function (Blueprint $table): void {
            $table->foreignId('created_by_user_id')->nullable()->change();
        });
        foreach (['created', 'completed', 'posted', 'cancelled'] as $verb) {
            $this->ensureMembershipActorColumn(
                'stock_counts',
                "{$verb}_by_business_membership_id",
                "stock_counts_{$verb}_by_member_fk",
            );
        }
        if (! Schema::hasColumn('sales', 'cashier_name')) {
            Schema::table('sales', function (Blueprint $table): void {
                $table->string('cashier_name', 120)->nullable()->after('external_order_number');
            });
        }
        $this->ensureMembershipActorColumn(
            'audit_logs',
            'actor_business_membership_id',
            'audit_logs_actor_member_fk',
        );

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
                if ($businessId === null) {
                    throw new RuntimeException("{$tableName} Store [{$row->store_id}] has no Business.");
                }

                $membershipId = $this->resolveActorMembership((int) $businessId, (int) $row->{$userColumn});
                DB::table($tableName)->where('id', $row->id)->update([$membershipColumn => $membershipId]);
            });
    }

    private function resolveActorMembership(int $businessId, int $userId): int
    {
        $membershipId = DB::table('business_memberships')
            ->where('business_id', $businessId)->where('user_id', $userId)->value('id');
        if ($membershipId !== null) {
            return (int) $membershipId;
        }

        $displayName = DB::table('users')->where('id', $userId)->value('name');
        if ($displayName === null) {
            throw new RuntimeException("Historical actor User [{$userId}] does not exist.");
        }

        DB::table('business_memberships')->insertOrIgnore([
            'public_id' => (string) Str::ulid(),
            'business_id' => $businessId,
            'user_id' => $userId,
            'display_name' => Str::limit((string) $displayName, 120, ''),
            'business_role' => BusinessRole::Staff->value,
            'status' => MembershipStatus::Suspended->value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $membershipId = DB::table('business_memberships')
            ->where('business_id', $businessId)->where('user_id', $userId)->value('id');
        if ($membershipId === null) {
            throw new RuntimeException("Unable to preserve historical actor User [{$userId}] for Business [{$businessId}].");
        }

        return (int) $membershipId;
    }

    private function ensureMembershipActorColumn(string $tableName, string $column, string $foreignKey): void
    {
        if (! Schema::hasColumn($tableName, $column)) {
            Schema::table($tableName, function (Blueprint $table) use ($column): void {
                $table->foreignId($column)->nullable();
            });
        }

        if (! Schema::hasForeignKey($tableName, [$column])) {
            Schema::table($tableName, function (Blueprint $table) use ($column, $foreignKey): void {
                $table->foreign($column, $foreignKey)
                    ->references('id')->on('business_memberships')->restrictOnDelete();
            });
        }
    }

    private function backfillAudits(): void
    {
        DB::table('audit_logs')->whereNotNull('store_id')->where('actor_type', 'App\\Models\\User')
            ->whereNull('actor_business_membership_id')->orderBy('id')->eachById(function (object $audit): void {
                $businessId = DB::table('stores')->where('id', $audit->store_id)->value('business_id');
                if ($businessId === null) {
                    throw new RuntimeException("Audit [{$audit->id}] Store [{$audit->store_id}] has no Business.");
                }

                $membershipId = $this->resolveActorMembership((int) $businessId, (int) $audit->actor_id);
                DB::table('audit_logs')->where('id', $audit->id)->update(['actor_business_membership_id' => $membershipId]);
            });
    }
};
