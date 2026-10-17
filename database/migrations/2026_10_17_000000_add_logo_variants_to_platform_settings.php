<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->string('logo_dark_path')->nullable()->after('logo_path');
            $table->string('logo_monochrome_path')->nullable()->after('logo_dark_path');
            $table->string('mark_path')->nullable()->after('logo_monochrome_path');
            $table->string('mark_dark_path')->nullable()->after('mark_path');
            $table->string('mark_monochrome_path')->nullable()->after('mark_dark_path');
        });
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn([
                'logo_dark_path',
                'logo_monochrome_path',
                'mark_path',
                'mark_dark_path',
                'mark_monochrome_path',
            ]);
        });
    }
};
