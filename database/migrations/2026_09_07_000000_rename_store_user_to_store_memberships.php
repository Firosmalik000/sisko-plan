<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('store_memberships')) {
            if (Schema::hasTable('store_user')) {
                throw new RuntimeException('Both store membership tables exist; resolve the duplicate schema before migrating.');
            }

            return;
        }

        if (! Schema::hasTable('store_user')) {
            throw new RuntimeException('The store_user table is missing; membership data cannot be safely renamed.');
        }

        $rowCount = DB::table('store_user')->count();

        Schema::rename('store_user', 'store_memberships');

        if (DB::table('store_memberships')->count() !== $rowCount) {
            throw new RuntimeException('Store membership row count changed during table rename.');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('store_user')) {
            if (Schema::hasTable('store_memberships')) {
                throw new RuntimeException('Both store membership tables exist; rollback cannot choose a safe source.');
            }

            return;
        }

        if (! Schema::hasTable('store_memberships')) {
            throw new RuntimeException('The store_memberships table is missing; membership data cannot be safely restored.');
        }

        $rowCount = DB::table('store_memberships')->count();

        Schema::rename('store_memberships', 'store_user');

        if (DB::table('store_user')->count() !== $rowCount) {
            throw new RuntimeException('Store membership row count changed during table rollback.');
        }
    }
};
