<?php

namespace Database\Seeders;

use App\Actions\Stores\CreateStore;
use App\Enums\PlatformAdminRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    private const STARTER_USER = [
        'name' => 'Owner',
        'email' => 'test@example.com',
        'password' => 'password',
        'store_name' => 'Toko Demo',
    ];

    private const STARTER_PLATFORM_ADMIN = [
        'name' => 'Super Admin',
        'email' => 'admin@example.com',
        'password' => 'password',
    ];

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(PlanSeeder::class);

        if (app()->environment('production')) {
            $this->command->warn('Paket sistem diperbarui. Akun demo tidak dibuat di production; gunakan platform-admin:create untuk Platform Admin awal.');

            return;
        }

        DB::transaction(function (): void {
            $user = User::query()->updateOrCreate(
                ['email' => Str::lower(self::STARTER_USER['email'])],
                [
                    'name' => self::STARTER_USER['name'],
                    'password' => self::STARTER_USER['password'],
                    'status' => UserStatus::Active,
                ],
            );
            $user->forceFill(['email_verified_at' => now()])->save();

            User::query()->updateOrCreate(
                ['email' => Str::lower(self::STARTER_PLATFORM_ADMIN['email'])],
                [
                    'name' => self::STARTER_PLATFORM_ADMIN['name'],
                    'password' => self::STARTER_PLATFORM_ADMIN['password'],
                    'platform_role' => PlatformAdminRole::SuperAdmin,
                    'status' => UserStatus::Active,
                    'email_verified_at' => now(),
                ],
            );

            if (! $user->ownedStores()->exists()) {
                app(CreateStore::class)->handle($user, self::STARTER_USER['store_name']);
            }
        });
    }
}
