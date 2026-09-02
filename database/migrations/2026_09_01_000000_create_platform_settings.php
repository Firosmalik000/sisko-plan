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
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('brand_name', 100);
            $table->string('tagline', 160)->nullable();
            $table->string('site_url', 2048)->nullable();
            $table->string('support_email')->nullable();
            $table->string('support_phone', 30)->nullable();
            $table->json('social_links')->nullable();
            $table->string('seo_title', 60);
            $table->string('seo_description', 160)->nullable();
            $table->text('seo_keywords')->nullable();
            $table->string('social_image_url', 2048)->nullable();
            $table->boolean('robots_index')->default(true);
            $table->timestamps();
        });

        DB::table('platform_settings')->insert([
            'id' => 1,
            'brand_name' => config('app.name', 'Sisko Plan'),
            'tagline' => 'Scan barangnya. Sisanya langsung tercatat.',
            'site_url' => config('app.url'),
            'seo_title' => 'Scan Barang, Kelola Toko Lebih Cepat',
            'seo_description' => 'Scan barang, catat transaksi, perbarui stok, dan pantau laporan toko dalam satu alur.',
            'robots_index' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $permissionKey = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $modelKey = $columnNames['model_morph_key'];
        $now = now();
        $permissions = [
            PlatformPermission::BRANDING_VIEW,
            PlatformPermission::BRANDING_MANAGE,
        ];

        DB::table($tableNames['permissions'])->insertOrIgnore(array_map(
            fn (string $permission): array => [
                'name' => $permission,
                'guard_name' => 'web',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            $permissions,
        ));

        $permissionIds = DB::table($tableNames['permissions'])
            ->where('guard_name', 'web')
            ->whereIn('name', $permissions)
            ->pluck('id');
        $adminIds = DB::table('users')->where('platform_role', 'admin')->pluck('id');
        $assignments = [];

        foreach ($adminIds as $adminId) {
            foreach ($permissionIds as $permissionId) {
                $assignments[] = [
                    $permissionKey => $permissionId,
                    $modelKey => $adminId,
                    'model_type' => User::class,
                ];
            }
        }

        if ($assignments !== []) {
            DB::table($tableNames['model_has_permissions'])->insertOrIgnore($assignments);
        }

        app('cache')
            ->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names');

        DB::table($tableNames['permissions'])
            ->where('guard_name', 'web')
            ->whereIn('name', [
                PlatformPermission::BRANDING_VIEW,
                PlatformPermission::BRANDING_MANAGE,
            ])
            ->delete();

        Schema::dropIfExists('platform_settings');

        app('cache')
            ->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }
};
