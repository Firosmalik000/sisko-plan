<?php

use App\Models\User;
use App\Support\PlatformPermission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table): void {
            $table->char('code', 3)->primary();
            $table->string('name', 80);
            $table->string('symbol', 8);
            $table->unsignedTinyInteger('decimal_places')->default(0);
            $table->string('symbol_position', 10)->default('before');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('countries', function (Blueprint $table): void {
            $table->id();
            $table->char('code', 2)->unique();
            $table->string('name_id', 100);
            $table->string('name_ms', 100);
            $table->string('name_en', 100);
            $table->char('currency_code', 3);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
        });

        $now = now();
        DB::table('currencies')->insert([
            ['code' => 'IDR', 'name' => 'Indonesian Rupiah', 'symbol' => 'Rp', 'decimal_places' => 0, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'MYR', 'name' => 'Malaysian Ringgit', 'symbol' => 'RM', 'decimal_places' => 2, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'THB', 'name' => 'Thai Baht', 'symbol' => '฿', 'decimal_places' => 2, 'symbol_position' => 'before', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'VND', 'name' => 'Vietnamese Dong', 'symbol' => '₫', 'decimal_places' => 0, 'symbol_position' => 'after', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
        DB::table('countries')->insert([
            ['code' => 'ID', 'name_id' => 'Indonesia', 'name_ms' => 'Indonesia', 'name_en' => 'Indonesia', 'currency_code' => 'IDR', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'MY', 'name_id' => 'Malaysia', 'name_ms' => 'Malaysia', 'name_en' => 'Malaysia', 'currency_code' => 'MYR', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'TH', 'name_id' => 'Thailand', 'name_ms' => 'Thailand', 'name_en' => 'Thailand', 'currency_code' => 'THB', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'VN', 'name_id' => 'Vietnam', 'name_ms' => 'Vietnam', 'name_en' => 'Vietnam', 'currency_code' => 'VND', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

        Schema::table('stores', function (Blueprint $table): void {
            $table->foreignId('country_id')->nullable()->after('owner_user_id')->constrained('countries')->restrictOnDelete();
            $table->index(['country_id', 'status']);
        });

        $indonesiaId = DB::table('countries')->where('code', 'ID')->value('id');
        DB::table('stores')->orderBy('id')->eachById(function (object $store) use ($indonesiaId): void {
            $currency = DB::table('store_settings')->where('store_id', $store->id)->value('currency');
            $countryId = DB::table('countries')->where('currency_code', $currency)->value('id') ?? $indonesiaId;
            DB::table('stores')->where('id', $store->id)->update(['country_id' => $countryId]);
        });

        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $permissionKey = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $modelKey = $columnNames['model_morph_key'];
        $permissions = [PlatformPermission::GEOGRAPHY_VIEW, PlatformPermission::GEOGRAPHY_MANAGE];
        DB::table($tableNames['permissions'])->insertOrIgnore(array_map(fn (string $permission): array => [
            'name' => $permission, 'guard_name' => 'web', 'created_at' => $now, 'updated_at' => $now,
        ], $permissions));
        $permissionIds = DB::table($tableNames['permissions'])->where('guard_name', 'web')->whereIn('name', $permissions)->pluck('id');
        $assignments = [];
        foreach (DB::table('users')->where('platform_role', 'admin')->pluck('id') as $adminId) {
            foreach ($permissionIds as $permissionId) {
                $assignments[] = [$permissionKey => $permissionId, $modelKey => $adminId, 'model_type' => User::class];
            }
        }
        if ($assignments !== []) {
            DB::table($tableNames['model_has_permissions'])->insertOrIgnore($assignments);
        }
        app('cache')->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names');
        DB::table($tableNames['permissions'])->where('guard_name', 'web')->whereIn('name', [
            PlatformPermission::GEOGRAPHY_VIEW, PlatformPermission::GEOGRAPHY_MANAGE,
        ])->delete();
        Schema::table('stores', function (Blueprint $table): void {
            $table->dropForeign(['country_id']);
            $table->dropIndex(['country_id', 'status']);
            $table->dropColumn('country_id');
        });
        Schema::dropIfExists('countries');
        Schema::dropIfExists('currencies');
        app('cache')->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)->forget(config('permission.cache.key'));
    }
};
