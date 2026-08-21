<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_admins', function (Blueprint $table) {
            $table->string('role', 30)->default('admin')->after('email')->index();
        });

        $firstAdminId = DB::table('platform_admins')->orderBy('id')->value('id');
        if ($firstAdminId !== null) {
            DB::table('platform_admins')->where('id', $firstAdminId)->update(['role' => 'super_admin']);
        }
    }

    public function down(): void
    {
        Schema::table('platform_admins', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn('role');
        });
    }
};
