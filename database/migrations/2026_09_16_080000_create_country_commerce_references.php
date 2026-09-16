<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('label', 120);
            $table->string('kind', 30);
            $table->string('checkout_method', 30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('country_payment_method', function (Blueprint $table): void {
            $table->foreignId('country_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('priority')->default(0);
            $table->boolean('is_enabled')->default(true);
            $table->primary(['country_id', 'payment_method_id']);
        });
        Schema::create('marketplaces', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('label', 120);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('country_marketplace', function (Blueprint $table): void {
            $table->foreignId('country_id')->constrained()->cascadeOnDelete();
            $table->foreignId('marketplace_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('priority')->default(0);
            $table->boolean('is_enabled')->default(true);
            $table->primary(['country_id', 'marketplace_id']);
        });
        Schema::create('store_marketplace', function (Blueprint $table): void {
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('marketplace_id')->constrained()->restrictOnDelete();
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();
            $table->primary(['store_id', 'marketplace_id']);
        });

        $this->seedReferences();

        Schema::table('financial_accounts', function (Blueprint $table): void {
            $table->foreignId('payment_method_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('marketplace_id')->nullable()->constrained()->restrictOnDelete();
        });
        Schema::table('sales', function (Blueprint $table): void {
            $table->foreignId('marketplace_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('marketplace_name', 120)->nullable();
        });
        DB::table('financial_accounts')->whereNotNull('payment_code')->orderBy('id')->eachById(fn (object $account) => DB::table('financial_accounts')->where('id', $account->id)->update([
            'payment_method_id' => DB::table('payment_methods')->where('code', $account->payment_code)->value('id'),
        ]));
        DB::table('financial_accounts')->whereNotNull('marketplace_code')->orderBy('id')->eachById(fn (object $account) => DB::table('financial_accounts')->where('id', $account->id)->update([
            'marketplace_id' => DB::table('marketplaces')->where('code', $account->marketplace_code)->value('id') ?? DB::table('marketplaces')->where('code', 'other')->value('id'),
        ]));
        DB::table('sales')->whereNotNull('marketplace_code')->orderBy('id')->eachById(function (object $sale): void {
            $marketplaceId = DB::table('marketplaces')->where('code', $sale->marketplace_code)->value('id');
            $marketplaceLabel = DB::table('marketplaces')->where('code', $sale->marketplace_code)->value('label');
            DB::table('sales')->where('id', $sale->id)->update([
                'marketplace_id' => $marketplaceId ?? DB::table('marketplaces')->where('code', 'other')->value('id'),
                'marketplace_name' => $marketplaceLabel ?? $sale->marketplace_code,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('marketplace_id');
            $table->dropColumn('marketplace_name');
        });
        Schema::table('financial_accounts', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('payment_method_id');
            $table->dropConstrainedForeignId('marketplace_id');
        });
        Schema::dropIfExists('store_marketplace');
        Schema::dropIfExists('country_marketplace');
        Schema::dropIfExists('marketplaces');
        Schema::dropIfExists('country_payment_method');
        Schema::dropIfExists('payment_methods');
    }

    private function seedReferences(): void
    {
        $now = now();
        $payments = [
            ['code' => 'qris', 'label' => 'QRIS', 'kind' => 'national_qr', 'checkout_method' => 'qris'],
            ['code' => 'duitnow_qr', 'label' => 'DuitNow QR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            ['code' => 'promptpay_qr', 'label' => 'PromptPay QR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            ['code' => 'vietqr', 'label' => 'VietQR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            ['code' => 'touch_n_go', 'label' => "Touch 'n Go eWallet", 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
        ];
        DB::table('payment_methods')->insert(array_map(fn (array $row): array => $row + ['is_active' => true, 'created_at' => $now, 'updated_at' => $now], $payments));
        foreach (['ID' => ['qris'], 'MY' => ['duitnow_qr', 'touch_n_go'], 'TH' => ['promptpay_qr'], 'VN' => ['vietqr']] as $country => $codes) {
            foreach ($codes as $priority => $code) {
                DB::table('country_payment_method')->insert([
                    'country_id' => DB::table('countries')->where('code', $country)->value('id'),
                    'payment_method_id' => DB::table('payment_methods')->where('code', $code)->value('id'),
                    'priority' => $priority,
                    'is_enabled' => true,
                ]);
            }
        }

        $marketplaces = ['shopee' => 'Shopee', 'tokopedia' => 'Tokopedia', 'blibli' => 'Blibli', 'lazada' => 'Lazada', 'tiktok_shop' => 'TikTok Shop', 'other' => 'Marketplace lainnya'];
        foreach ($marketplaces as $code => $label) {
            DB::table('marketplaces')->insert(['code' => $code, 'label' => $label, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }
        $countryCodes = DB::table('countries')->whereIn('code', ['BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN'])->pluck('code');
        foreach ($countryCodes as $country) {
            $codes = match ($country) {
                'ID' => ['shopee', 'tokopedia', 'tiktok_shop', 'blibli', 'lazada', 'other'],
                'MY', 'TH', 'VN' => ['shopee', 'lazada', 'tiktok_shop', 'other'],
                default => ['other'],
            };
            foreach ($codes as $priority => $code) {
                DB::table('country_marketplace')->insert([
                    'country_id' => DB::table('countries')->where('code', $country)->value('id'),
                    'marketplace_id' => DB::table('marketplaces')->where('code', $code)->value('id'),
                    'priority' => $priority,
                    'is_enabled' => true,
                ]);
            }
        }
    }
};
