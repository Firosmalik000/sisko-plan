<?php

namespace App\Support;

use App\Enums\FinancialAccountType;
use App\Models\Country;
use App\Models\FinancialAccount;
use App\Models\PaymentMethod;
use App\Services\Commerce\CountryCommerceCatalog;

class PaymentMethodCatalog
{
    /** @return array{code:string, method:string, label:string}|null */
    public static function qrForCountry(?string $countryCode): ?array
    {
        $country = Country::query()->where('code', strtoupper((string) $countryCode))->first();
        $payment = $country === null ? null : app(CountryCommerceCatalog::class)->paymentMethods($country)->firstWhere('kind', 'national_qr');

        return $payment === null ? null : ['code' => $payment->code, 'method' => $payment->checkout_method, 'label' => $payment->label];
    }

    /** @return array<int, array{code:string, label:string}> */
    public static function walletsForCountry(?string $countryCode): array
    {
        $country = Country::query()->where('code', strtoupper((string) $countryCode))->first();
        if ($country === null) {
            return [];
        }

        return app(CountryCommerceCatalog::class)->paymentMethods($country)->where('kind', 'e_wallet')
            ->map(fn (PaymentMethod $method): array => ['code' => $method->code, 'label' => $method->label])->values()->all();
    }

    /** @return array<int, string> */
    public static function walletCodesForCountry(?string $countryCode): array
    {
        return array_values(array_filter(array_column(self::walletsForCountry($countryCode), 'code'), 'is_string'));
    }

    /** @return array<int, string> */
    public static function qrCodes(): array
    {
        return PaymentMethod::query()->where(['kind' => 'national_qr', 'is_active' => true])->orderBy('id')->pluck('code')->all();
    }

    /** @return array<int, string> */
    public static function walletCodes(): array
    {
        return PaymentMethod::query()->where(['kind' => 'e_wallet', 'is_active' => true])->orderBy('id')->pluck('code')->all();
    }

    public static function acceptsInStoreAccount(FinancialAccount $account, string $paymentMethod, ?string $countryCode): bool
    {
        if ($account->marketplace_code !== null) {
            return false;
        }

        $qrPayment = self::qrForCountry($countryCode);
        $qrCodes = self::qrCodes();
        $walletCodes = self::walletCodes();
        $countryWalletCodes = self::walletCodesForCountry($countryCode);
        $isQrAccount = $account->type !== FinancialAccountType::Cash
            && $qrPayment !== null
            && $account->payment_code === $qrPayment['code'];

        return match ($paymentMethod) {
            'cash' => $account->type === FinancialAccountType::Cash && $account->payment_code === null,
            'qris', 'qr_payment' => $qrPayment !== null && $paymentMethod === $qrPayment['method'] && $isQrAccount,
            'bank_transfer' => $account->type === FinancialAccountType::Bank
                && ! in_array($account->payment_code, $qrCodes, true)
                && ! in_array($account->payment_code, $walletCodes, true),
            'e_wallet' => $account->type === FinancialAccountType::EWallet
                && ! in_array($account->payment_code, $qrCodes, true)
                && ($account->payment_code === null || in_array($account->payment_code, $countryWalletCodes, true)),
            default => false,
        };
    }
}
