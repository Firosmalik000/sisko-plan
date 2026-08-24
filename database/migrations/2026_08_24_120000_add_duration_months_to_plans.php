<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedTinyInteger('duration_months')->default(1)->after('monthly_price');
        });

        DB::table('plans')
            ->select(['id', 'name'])
            ->orderBy('id')
            ->each(function (object $plan): void {
                if (preg_match('/\b(1[0-2]|[1-9])\s*bulan\b/i', $plan->name, $matches) !== 1) {
                    return;
                }

                DB::table('plans')->where('id', $plan->id)->update([
                    'duration_months' => (int) $matches[1],
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('duration_months');
        });
    }
};
