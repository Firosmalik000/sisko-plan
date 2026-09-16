<?php

namespace App\Actions\Sales;

use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Services\Commerce\CountryCommerceCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ResolveMarketplaceAccount
{
    public function __construct(private CountryCommerceCatalog $catalog) {}

    public function handle(Store $store, string $marketplaceCode): FinancialAccount
    {
        $store->loadMissing('country');
        $marketplace = $this->catalog->marketplaces($store)->firstWhere('code', $marketplaceCode);

        if ($marketplace === null) {
            throw ValidationException::withMessages([
                'marketplace_code' => __('This marketplace is not available for the store country.'),
            ]);
        }

        return DB::transaction(function () use ($store, $marketplaceCode, $marketplace): FinancialAccount {
            Store::query()->whereKey($store->id)->lockForUpdate()->firstOrFail();

            $account = FinancialAccount::query()->firstOrCreate(
                ['store_id' => $store->id, 'marketplace_code' => $marketplaceCode],
                [
                    'name' => "{$marketplace->label} Marketplace",
                    'marketplace_id' => $marketplace->id,
                    'type' => FinancialAccountType::MarketplaceClearing->value,
                    'is_active' => true,
                    'notes' => 'Marketplace clearing account.',
                ],
            );

            if (! $account->is_active || $account->type !== FinancialAccountType::MarketplaceClearing) {
                $account->forceFill([
                    'type' => FinancialAccountType::MarketplaceClearing->value,
                    'marketplace_id' => $marketplace->id,
                    'is_active' => true,
                ])->save();
            }

            return $account;
        });
    }
}
