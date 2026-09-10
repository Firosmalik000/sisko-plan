<?php

namespace App\Actions\Sales;

use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Support\MarketplaceCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ResolveMarketplaceAccount
{
    public function handle(Store $store, string $marketplaceCode): FinancialAccount
    {
        $store->loadMissing('country');
        $label = MarketplaceCatalog::label($store->country?->code, $marketplaceCode);

        if ($label === null) {
            throw ValidationException::withMessages([
                'marketplace_code' => __('Marketplace tidak tersedia untuk negara toko ini.'),
            ]);
        }

        return DB::transaction(function () use ($store, $marketplaceCode, $label): FinancialAccount {
            Store::query()->whereKey($store->id)->lockForUpdate()->firstOrFail();

            $account = FinancialAccount::query()->firstOrCreate(
                ['store_id' => $store->id, 'marketplace_code' => $marketplaceCode],
                [
                    'name' => "{$label} Marketplace",
                    'type' => FinancialAccountType::EWallet->value,
                    'is_active' => true,
                    'notes' => 'Marketplace clearing account.',
                ],
            );

            if (! $account->is_active || $account->type !== FinancialAccountType::EWallet) {
                $account->forceFill([
                    'type' => FinancialAccountType::EWallet->value,
                    'is_active' => true,
                ])->save();
            }

            return $account;
        });
    }
}
