<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CountryPaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            'tarus_qr' => ['label' => 'tarusQR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'khqr' => ['label' => 'KHQR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'qris' => ['label' => 'QRIS', 'kind' => 'national_qr', 'checkout_method' => 'qris'],
            'lao_qr' => ['label' => 'Lao QR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'duitnow_qr' => ['label' => 'DuitNow QR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'mmqr' => ['label' => 'MMQR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'qr_ph' => ['label' => 'QR Ph', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'paynow_sgqr' => ['label' => 'PayNow / SGQR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'promptpay_qr' => ['label' => 'PromptPay / Thai QR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'tuqr' => ['label' => 'TUQR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'vietqr' => ['label' => 'VietQR', 'kind' => 'national_qr', 'checkout_method' => 'qr_payment'],
            'gopay' => ['label' => 'GoPay', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'dana' => ['label' => 'DANA', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'ovo' => ['label' => 'OVO', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'shopeepay' => ['label' => 'ShopeePay', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'touch_n_go' => ['label' => "Touch 'n Go eWallet", 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'boost' => ['label' => 'Boost', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'grabpay' => ['label' => 'GrabPay', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'gcash' => ['label' => 'GCash', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'maya' => ['label' => 'Maya', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'truemoney' => ['label' => 'TrueMoney', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'momo' => ['label' => 'MoMo', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'zalopay' => ['label' => 'ZaloPay', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
            'vnpay' => ['label' => 'VNPAY', 'kind' => 'e_wallet', 'checkout_method' => 'e_wallet'],
        ];
        foreach ($methods as $code => $attributes) {
            PaymentMethod::query()->firstOrCreate(['code' => $code], $attributes + ['is_active' => true]);
        }

        $countries = [
            'BN' => ['tarus_qr'], 'KH' => ['khqr'],
            'ID' => ['qris', 'gopay', 'dana', 'ovo', 'shopeepay'],
            'LA' => ['lao_qr'],
            'MY' => ['duitnow_qr', 'touch_n_go', 'boost', 'grabpay'],
            'MM' => ['mmqr'],
            'PH' => ['qr_ph', 'gcash', 'maya'],
            'SG' => ['paynow_sgqr', 'grabpay'],
            'TH' => ['promptpay_qr', 'truemoney'],
            'TL' => ['tuqr'],
            'VN' => ['vietqr', 'momo', 'zalopay', 'vnpay'],
        ];
        foreach ($countries as $countryCode => $codes) {
            $countryId = Country::query()->where('code', $countryCode)->valueOrFail('id');
            foreach ($codes as $priority => $code) {
                DB::table('country_payment_method')->insertOrIgnore([
                    'country_id' => $countryId,
                    'payment_method_id' => PaymentMethod::query()->where('code', $code)->valueOrFail('id'),
                    'priority' => $priority,
                    'is_enabled' => true,
                ]);
            }
        }
    }
}
