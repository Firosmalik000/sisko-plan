<?php

namespace App\Support;

use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;

class PaymentMethodCatalog
{
    /** @return array{code:string, method:string, label:string} */
    public static function qrForCountry(?string $countryCode): array
    {
        $payments = config('sales.qr_payments', []);

        return $payments[strtoupper((string) $countryCode)] ?? $payments['default'];
    }

    /** @return array<int, array{code:string, label:string}> */
    public static function walletsForCountry(?string $countryCode): array
    {
        return array_values(config('sales.country_wallets.'.strtoupper((string) $countryCode), []));
    }

    /** @return array<int, string> */
    public static function walletCodesForCountry(?string $countryCode): array
    {
        return array_values(array_filter(array_column(self::walletsForCountry($countryCode), 'code'), 'is_string'));
    }

    /** @return array<int, string> */
    public static function qrCodes(): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn (mixed $payment): ?string => is_array($payment) && is_string($payment['code'] ?? null)
                ? $payment['code']
                : null,
            config('sales.qr_payments', []),
        ))));
    }

    /** @return array<int, string> */
    public static function walletCodes(): array
    {
        $codes = [];
        foreach (config('sales.country_wallets', []) as $wallets) {
            if (! is_array($wallets)) {
                continue;
            }

            foreach ($wallets as $wallet) {
                if (is_array($wallet) && is_string($wallet['code'] ?? null)) {
                    $codes[] = $wallet['code'];
                }
            }
        }

        return array_values(array_unique($codes));
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
            && $account->payment_code === $qrPayment['code'];

        return match ($paymentMethod) {
            'cash' => $account->type === FinancialAccountType::Cash && $account->payment_code === null,
            'qris', 'qr_payment' => $paymentMethod === $qrPayment['method'] && $isQrAccount,
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
