<?php

use App\Enums\BusinessRole;
use App\Enums\BusinessStatus;
use App\Enums\MembershipStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'subscriptions',
        'subscription_periods',
        'subscription_addons',
        'subscription_payments',
        'subscription_scan_usages',
        'subscription_scan_events',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            $this->ensureNullableForeignId($tableName, 'business_id', 'businesses');
        }
        $this->ensureNullableForeignId('subscription_payments', 'purchaser_user_id', 'users', 'business_id');

        DB::table('subscriptions')->orderBy('id')->eachById(function (object $subscription): void {
            $businessId = $this->resolveOwningBusiness($subscription);
            DB::table('subscriptions')->where('id', $subscription->id)->update(['business_id' => $businessId]);
        });

        foreach (['subscription_periods', 'subscription_addons', 'subscription_payments'] as $tableName) {
            DB::table($tableName)->orderBy('id')->eachById(function (object $row) use ($tableName): void {
                $businessId = DB::table('subscriptions')->where('id', $row->subscription_id)->value('business_id');
                if ($businessId === null) {
                    throw new RuntimeException("{$tableName} row [{$row->id}] has no Business subscription.");
                }
                $attributes = ['business_id' => $businessId];
                if ($tableName === 'subscription_payments') {
                    $attributes['purchaser_user_id'] = $row->user_id;
                }
                DB::table($tableName)->where('id', $row->id)->update($attributes);
            });
        }

        DB::table('subscription_scan_usages')->orderBy('id')->eachById(function (object $usage): void {
            $businessId = DB::table('business_memberships')->where('user_id', $usage->user_id)
                ->where('business_role', 'owner')->orderBy('id')->value('business_id');
            if ($businessId === null) {
                throw new RuntimeException("Scan usage [{$usage->id}] has no owning Business.");
            }
            DB::table('subscription_scan_usages')->where('id', $usage->id)->update(['business_id' => $businessId]);
        });
        DB::table('subscription_scan_events')->orderBy('id')->eachById(function (object $event): void {
            $businessId = DB::table('subscription_scan_usages')->where('id', $event->usage_id)->value('business_id');
            if ($businessId === null) {
                throw new RuntimeException("Scan event [{$event->id}] has no owning Business.");
            }
            DB::table('subscription_scan_events')->where('id', $event->id)->update(['business_id' => $businessId]);
        });

        $this->replaceUserUniqueIndex('subscriptions', ['user_id'], ['business_id']);
        $this->replaceUserUniqueIndex(
            'subscription_scan_usages',
            ['user_id', 'period_start'],
            ['business_id', 'period_start'],
        );
        $this->replaceUserUniqueIndex(
            'subscription_scan_events',
            ['user_id', 'request_key'],
            ['business_id', 'request_key'],
        );
    }

    public function down(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('purchaser_user_id');
        });

        Schema::table('subscription_scan_events', function (Blueprint $table): void {
            $table->dropForeign(['business_id']);
            $table->dropUnique(['business_id', 'request_key']);
            $table->unique(['user_id', 'request_key']);
            $table->foreign('business_id')->references('id')->on('businesses')->restrictOnDelete();
        });
        Schema::table('subscription_scan_usages', function (Blueprint $table): void {
            $table->dropForeign(['business_id']);
            $table->dropUnique(['business_id', 'period_start']);
            $table->unique(['user_id', 'period_start']);
            $table->foreign('business_id')->references('id')->on('businesses')->restrictOnDelete();
        });
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropForeign(['business_id']);
            $table->dropUnique(['business_id']);
            $table->unique('user_id');
            $table->foreign('business_id')->references('id')->on('businesses')->restrictOnDelete();
        });

        foreach (array_reverse($this->tables) as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropConstrainedForeignId('business_id');
            });
        }
    }

    private function ensureNullableForeignId(
        string $tableName,
        string $columnName,
        string $foreignTable,
        ?string $after = null,
    ): void {
        if (! Schema::hasColumn($tableName, $columnName)) {
            Schema::table($tableName, function (Blueprint $table) use ($columnName, $foreignTable, $after): void {
                $column = $table->foreignId($columnName)->nullable();
                if ($after !== null) {
                    $column->after($after);
                }
                $column->constrained($foreignTable)->restrictOnDelete();
            });

            return;
        }

        if (! Schema::hasForeignKey($tableName, [$columnName])) {
            Schema::table($tableName, function (Blueprint $table) use ($columnName, $foreignTable): void {
                $table->foreign($columnName)->references('id')->on($foreignTable)->restrictOnDelete();
            });
        }
    }

    /** @param object{id: int, user_id: int, store_id: int|null} $subscription */
    private function resolveOwningBusiness(object $subscription): int
    {
        $businessId = DB::table('business_memberships')
            ->where('user_id', $subscription->user_id)
            ->where('business_role', BusinessRole::Owner->value)
            ->orderBy('id')
            ->value('business_id');

        if ($businessId !== null) {
            return (int) $businessId;
        }

        return DB::transaction(function () use ($subscription): int {
            /** @var object{id: int, name: string}|null $user */
            $user = DB::table('users')->where('id', $subscription->user_id)->lockForUpdate()->first(['id', 'name']);
            if ($user === null) {
                throw new RuntimeException("Subscription [{$subscription->id}] has no owning User.");
            }

            $businessId = DB::table('business_memberships')
                ->where('user_id', $user->id)
                ->where('business_role', BusinessRole::Owner->value)
                ->orderBy('id')
                ->value('business_id');

            if ($businessId !== null) {
                return (int) $businessId;
            }

            $storeBusinessId = $subscription->store_id === null
                ? null
                : DB::table('stores')
                    ->where('id', $subscription->store_id)
                    ->where('owner_user_id', $user->id)
                    ->value('business_id');

            if ($subscription->store_id !== null && $storeBusinessId === null) {
                throw new RuntimeException("Subscription [{$subscription->id}] Store ownership is inconsistent.");
            }

            $businessId = $storeBusinessId ?? DB::table('businesses')->insertGetId([
                'public_id' => (string) Str::ulid(),
                'name' => $user->name,
                'status' => BusinessStatus::Active->value,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('business_memberships')->insert([
                'public_id' => (string) Str::ulid(),
                'business_id' => $businessId,
                'user_id' => $user->id,
                'display_name' => $user->name,
                'business_role' => BusinessRole::Owner->value,
                'status' => MembershipStatus::Active->value,
                'joined_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return (int) $businessId;
        }, 3);
    }

    /**
     * @param  list<string>  $legacyColumns
     * @param  list<string>  $businessColumns
     */
    private function replaceUserUniqueIndex(string $tableName, array $legacyColumns, array $businessColumns): void
    {
        if (Schema::hasForeignKey($tableName, ['user_id'])) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropForeign(['user_id']);
            });
        }

        if (Schema::hasIndex($tableName, $legacyColumns, 'unique')) {
            Schema::table($tableName, function (Blueprint $table) use ($legacyColumns): void {
                $table->dropUnique($legacyColumns);
            });
        }

        if (! Schema::hasIndex($tableName, $businessColumns, 'unique')) {
            Schema::table($tableName, function (Blueprint $table) use ($businessColumns): void {
                $table->unique($businessColumns);
            });
        }

        if (! Schema::hasForeignKey($tableName, ['user_id'])) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
            });
        }
    }
};
