<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var list<string> */
    private array $newTables = [
        'account_transfers', 'capital_transactions', 'cash_transactions', 'purchases',
        'purchase_payments', 'supplier_payable_transactions', 'expenses',
    ];

    /** @var list<string> */
    private array $existingTables = ['sales', 'sale_payments', 'sale_returns'];

    public function up(): void
    {
        foreach ($this->newTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->char('currency_code', 3)->nullable();
                $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();
            });
        }
        foreach ($this->existingTables as $tableName) {
            Schema::table($tableName, fn (Blueprint $table) => $table->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete());
        }

        foreach ([...$this->newTables, ...$this->existingTables] as $tableName) {
            DB::table($tableName)->whereNull('currency_code')->orderBy('id')->eachById(function (object $row) use ($tableName): void {
                $currency = DB::table('store_settings')->where('store_id', $row->store_id)->value('currency')
                    ?? DB::table('stores')->where('stores.id', $row->store_id)
                        ->join('countries', 'countries.id', '=', 'stores.country_id')->value('countries.currency_code');
                if (! is_string($currency) || ! DB::table('currencies')->where('code', $currency)->exists()) {
                    throw new RuntimeException("{$tableName} [{$row->id}] has no valid Store currency.");
                }
                DB::table($tableName)->where('id', $row->id)->update(['currency_code' => $currency]);
            });
            Schema::table($tableName, fn (Blueprint $table) => $table->char('currency_code', 3)->nullable(false)->change());
        }
    }

    public function down(): void
    {
        foreach ($this->existingTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropForeign(['currency_code']);
                $table->char('currency_code', 3)->nullable()->change();
            });
        }
        foreach (array_reverse($this->newTables) as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropForeign(['currency_code']);
                $table->dropColumn('currency_code');
            });
        }
    }
};
