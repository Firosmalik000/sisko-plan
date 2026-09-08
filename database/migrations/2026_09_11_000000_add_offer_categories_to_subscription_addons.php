<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table): void {
            $table->string('offer_category', 30)->nullable()->index()->after('kind');
        });
        Schema::table('subscription_addons', function (Blueprint $table): void {
            $table->string('offer_category', 30)->nullable()->index()->after('plan_name');
        });

        DB::table('plans')->where('kind', 'addon')->orderBy('id')->eachById(
            function (object $plan): void {
                DB::table('plans')->where('id', $plan->id)->update([
                    'offer_category' => $this->categoryFor($plan),
                ]);
            },
        );

        DB::table('subscription_addons')->orderBy('id')->eachById(
            function (object $addon): void {
                DB::table('subscription_addons')->where('id', $addon->id)->update([
                    'offer_category' => DB::table('plans')->where('id', $addon->plan_id)->value('offer_category') ?? 'general',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::table('subscription_addons', function (Blueprint $table): void {
            $table->dropIndex(['offer_category']);
            $table->dropColumn('offer_category');
        });
        Schema::table('plans', function (Blueprint $table): void {
            $table->dropIndex(['offer_category']);
            $table->dropColumn('offer_category');
        });
    }

    private function categoryFor(object $plan): string
    {
        $capacities = [
            'store_capacity' => (int) $plan->max_stores,
            'product_capacity' => (int) $plan->max_products,
            'staff_capacity' => (int) $plan->max_members,
            'scan_capacity' => (int) $plan->max_scans,
        ];
        $positive = array_filter($capacities, fn (int $capacity): bool => $capacity > 0);

        return count($positive) === 1 ? (string) array_key_first($positive) : 'general';
    }
};
