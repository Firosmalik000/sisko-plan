<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('platform_role', 30)->nullable()->after('status')->index();
        });

        $userIdsByAdminId = [];
        foreach (DB::table('platform_admins')->orderBy('id')->get() as $admin) {
            $user = DB::table('users')->where('email', $admin->email)->first();

            if ($user === null) {
                $userId = DB::table('users')->insertGetId([
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'email_verified_at' => now(),
                    'password' => $admin->password,
                    'status' => $admin->is_active ? 'active' : 'suspended',
                    'platform_role' => $admin->role,
                    'two_factor_secret' => $admin->two_factor_secret,
                    'two_factor_recovery_codes' => $admin->two_factor_recovery_codes,
                    'two_factor_confirmed_at' => $admin->two_factor_confirmed_at,
                    'last_login_at' => $admin->last_login_at,
                    'remember_token' => $admin->remember_token,
                    'created_at' => $admin->created_at,
                    'updated_at' => $admin->updated_at,
                ]);
            } else {
                $userId = $user->id;
                DB::table('users')->where('id', $userId)->update([
                    'platform_role' => $admin->role,
                    'status' => $admin->is_active ? 'active' : 'suspended',
                    'two_factor_secret' => $user->two_factor_secret ?? $admin->two_factor_secret,
                    'two_factor_recovery_codes' => $user->two_factor_recovery_codes ?? $admin->two_factor_recovery_codes,
                    'two_factor_confirmed_at' => $user->two_factor_confirmed_at ?? $admin->two_factor_confirmed_at,
                    'last_login_at' => $user->last_login_at ?? $admin->last_login_at,
                    'updated_at' => now(),
                ]);
            }

            $userIdsByAdminId[$admin->id] = $userId;
        }

        $this->moveReferences('admin_audit_logs', 'platform_admin_id', 'user_id', $userIdsByAdminId, false);
        $this->moveReferences('subscriptions', 'created_by_platform_admin_id', 'created_by_user_id', $userIdsByAdminId, true);
        $this->moveReferences('subscription_payments', 'created_by_platform_admin_id', 'created_by_user_id', $userIdsByAdminId, false);

        Schema::drop('platform_admins');
    }

    public function down(): void
    {
        Schema::create('platform_admins', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('role', 30)->default('admin')->index();
            $table->string('password');
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        $adminIdsByUserId = [];
        foreach (DB::table('users')->whereNotNull('platform_role')->orderBy('id')->get() as $user) {
            $adminIdsByUserId[$user->id] = DB::table('platform_admins')->insertGetId([
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->platform_role,
                'password' => $user->password,
                'two_factor_secret' => $user->two_factor_secret,
                'two_factor_recovery_codes' => $user->two_factor_recovery_codes,
                'two_factor_confirmed_at' => $user->two_factor_confirmed_at,
                'is_active' => $user->status === 'active',
                'last_login_at' => $user->last_login_at,
                'remember_token' => $user->remember_token,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ]);
        }

        $this->moveReferences('admin_audit_logs', 'user_id', 'platform_admin_id', $adminIdsByUserId, false, 'platform_admins');
        $this->moveReferences('subscriptions', 'created_by_user_id', 'created_by_platform_admin_id', $adminIdsByUserId, true, 'platform_admins');
        $this->moveReferences('subscription_payments', 'created_by_user_id', 'created_by_platform_admin_id', $adminIdsByUserId, false, 'platform_admins');

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['platform_role']);
            $table->dropColumn('platform_role');
        });
    }

    /** @param array<int, int> $idMap */
    private function moveReferences(
        string $table,
        string $from,
        string $to,
        array $idMap,
        bool $nullable,
        string $targetTable = 'users',
    ): void {
        Schema::table($table, function (Blueprint $blueprint) use ($from): void {
            $blueprint->dropForeign([$from]);
        });

        foreach ($idMap as $oldId => $newId) {
            DB::table($table)->where($from, $oldId)->update([$from => $newId]);
        }

        Schema::table($table, function (Blueprint $blueprint) use ($from, $to): void {
            $blueprint->renameColumn($from, $to);
        });
        Schema::table($table, function (Blueprint $blueprint) use ($to, $nullable, $targetTable): void {
            $foreign = $blueprint->foreign($to)->references('id')->on($targetTable);
            $nullable ? $foreign->nullOnDelete() : $foreign->restrictOnDelete();
        });
    }
};
