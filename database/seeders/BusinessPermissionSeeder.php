<?php

namespace Database\Seeders;

use App\Enums\PlatformAdminRole;
use App\Models\User;
use App\Support\PlatformPermission;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class BusinessPermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PlatformPermission::all() as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        User::query()->where('platform_role', PlatformAdminRole::Admin->value)->eachById(function (User $admin): void {
            $missing = array_values(array_diff(PlatformPermission::defaultAdmin(), $admin->getPermissionNames()->all()));
            if ($missing !== []) {
                $admin->givePermissionTo($missing);
            }
        });
    }
}
