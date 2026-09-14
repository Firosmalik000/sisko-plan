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
        Schema::create('promotions', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('name', 160);
            $table->string('placement', 32);
            $table->string('image_path');
            $table->string('destination_url', 2048)->nullable();
            $table->string('locale', 8)->default('all');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('status', 16)->default('draft');
            $table->string('frequency', 32)->nullable();
            $table->timestamps();

            $table->index(['placement', 'status', 'starts_at', 'ends_at'], 'promotions_delivery_window_index');
            $table->index(['placement', 'status', 'locale', 'sort_order'], 'promotions_delivery_order_index');
        });

        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $permissionKey = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $modelKey = $columnNames['model_morph_key'];
        $now = now();
        $permissions = [PlatformPermission::PROMOTIONS_VIEW, PlatformPermission::PROMOTIONS_MANAGE];

        DB::table($tableNames['permissions'])->insertOrIgnore(array_map(fn (string $permission): array => [
            'name' => $permission,
            'guard_name' => 'web',
            'created_at' => $now,
            'updated_at' => $now,
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
            PlatformPermission::PROMOTIONS_VIEW,
            PlatformPermission::PROMOTIONS_MANAGE,
        ])->delete();
        Schema::dropIfExists('promotions');
        app('cache')->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)->forget(config('permission.cache.key'));
    }
};
