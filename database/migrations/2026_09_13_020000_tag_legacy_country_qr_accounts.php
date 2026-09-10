<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $payments = [
            'ID' => ['code' => 'qris', 'label' => 'QRIS'],
            'MY' => ['code' => 'duitnow_qr', 'label' => 'DuitNow QR'],
            'TH' => ['code' => 'promptpay_qr', 'label' => 'PromptPay QR'],
            'VN' => ['code' => 'vietqr', 'label' => 'VietQR'],
        ];

        DB::transaction(function () use ($payments): void {
            $stores = DB::table('stores')
                ->join('countries', 'countries.id', '=', 'stores.country_id')
                ->whereIn('countries.code', array_keys($payments))
                ->get(['stores.id', 'countries.code']);

            foreach ($stores as $store) {
                $payment = $payments[$store->code];
                $alreadyTagged = DB::table('financial_accounts')
                    ->where('store_id', $store->id)
                    ->where('payment_code', $payment['code'])
                    ->exists();
                if ($alreadyTagged) {
                    continue;
                }

                $legacyAccountId = DB::table('financial_accounts')
                    ->where('store_id', $store->id)
                    ->whereNull('marketplace_code')
                    ->whereNull('payment_code')
                    ->whereIn('type', ['bank', 'e_wallet'])
                    ->whereRaw('LOWER(name) = ?', [strtolower($payment['label'])])
                    ->orderBy('id')
                    ->value('id');
                if ($legacyAccountId !== null) {
                    DB::table('financial_accounts')
                        ->where('id', $legacyAccountId)
                        ->update(['payment_code' => $payment['code']]);
                }
            }
        });
    }

    public function down(): void
    {
        // Preserve classifications: clearing them could affect accounts created after this migration ran.
    }
};
