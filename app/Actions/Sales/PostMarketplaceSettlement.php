<?php

namespace App\Actions\Sales;

use App\Actions\Expenses\PostExpense;
use App\Actions\Ledgers\ApplyCashTransaction;
use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Ledgers\LedgerTimestamp;
use App\Enums\FinancialAccountType;
use App\Models\BusinessMembership;
use App\Models\ExpenseCategory;
use App\Models\FinancialAccount;
use App\Models\Marketplace;
use App\Models\MarketplaceSettlement;
use App\Models\MarketplaceSettlementSale;
use App\Models\Sale;
use App\Models\Store;
use App\Services\Commerce\CountryCommerceCatalog;
use App\Services\Sales\MarketplaceSettlementCalculator;
use App\Support\Decimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostMarketplaceSettlement
{
    public function __construct(private ResolveMarketplaceAccount $clearingAccounts, private MarketplaceSettlementCalculator $calculator, private ApplyCashTransaction $cash, private PostExpense $expenses, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps, private CountryCommerceCatalog $catalog) {}

    /** @param list<int> $saleIds */
    public function handle(Store $store, BusinessMembership $actor, string $marketplaceCode, int $destinationAccountId, array $saleIds, string $feeAmount, string $otherDeductionAmount, string $occurredAt, ?string $notes, string $idempotencyKey): MarketplaceSettlement
    {
        $actor = BusinessMembership::operational($store, $actor);
        $date = $this->timestamps->parse($store, $occurredAt);
        $saleIds = array_values(array_unique(array_map('intval', $saleIds)));
        $requestHash = $this->idempotency->hash(compact('marketplaceCode', 'destinationAccountId', 'saleIds', 'feeAmount', 'otherDeductionAmount', 'notes') + ['occurred_at' => $date->toISOString()]);

        try {
            return DB::transaction(function () use ($store, $actor, $marketplaceCode, $destinationAccountId, $saleIds, $feeAmount, $otherDeductionAmount, $date, $notes, $idempotencyKey, $requestHash): MarketplaceSettlement {
                $existing = $this->idempotency->existing(fn () => MarketplaceSettlement::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing instanceof MarketplaceSettlement) {
                    return $existing;
                }
                if ($saleIds === []) {
                    throw ValidationException::withMessages(['sales' => __('Select at least one marketplace Sale.')]);
                }
                $marketplace = $this->catalog->marketplaces($store)->firstWhere('code', $marketplaceCode);
                abort_unless($marketplace instanceof Marketplace, 422);
                $destination = FinancialAccount::query()->where(['id' => $destinationAccountId, 'store_id' => $store->id, 'is_active' => true])
                    ->whereIn('type', [FinancialAccountType::Bank->value, FinancialAccountType::EWallet->value])->firstOrFail();
                $sales = Sale::query()->where('store_id', $store->id)->whereIn('id', $saleIds)
                    ->where(['sales_channel' => 'marketplace', 'marketplace_code' => $marketplaceCode])
                    ->whereDoesntHave('settlementAllocations')->lockForUpdate()->get();
                if ($sales->count() !== count($saleIds)) {
                    throw ValidationException::withMessages(['sales' => __('One or more Sales are unavailable or already settled.')]);
                }
                $gross = '0.0000';
                foreach ($sales as $sale) {
                    $gross = Decimal::add($gross, (string) $sale->total_amount, Decimal::MONEY_SCALE);
                }
                $amounts = $this->calculator->calculate($gross, $feeAmount, $otherDeductionAmount);
                $clearing = $this->clearingAccounts->handle($store, $marketplaceCode);
                $settlement = MarketplaceSettlement::create([
                    'store_id' => $store->id, 'marketplace_id' => $marketplace->id,
                    'clearing_account_id' => $clearing->id, 'destination_account_id' => $destination->id,
                    'currency_code' => $store->currencyCode(), 'gross_amount' => $amounts['gross'],
                    'fee_amount' => $amounts['fees'], 'other_deduction_amount' => $amounts['other_deductions'],
                    'net_amount' => $amounts['net'], 'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash, 'created_by_business_membership_id' => $actor->id,
                    'occurred_at' => $date, 'notes' => $notes,
                ]);
                foreach ($sales as $sale) {
                    MarketplaceSettlementSale::create(['marketplace_settlement_id' => $settlement->id, 'sale_id' => $sale->id, 'gross_amount' => $sale->total_amount]);
                }
                $this->cash->handle($store->id, $clearing->id, 'out', $amounts['net'], 'marketplace_settlement', $settlement, $date, $actor, $notes);
                $this->cash->handle($store->id, $destination->id, 'in', $amounts['net'], 'marketplace_settlement', $settlement, $date, $actor, $notes);
                $deductions = Decimal::add($amounts['fees'], $amounts['other_deductions'], Decimal::MONEY_SCALE);
                if (Decimal::compare($deductions, '0', Decimal::MONEY_SCALE) > 0) {
                    $category = ExpenseCategory::query()->firstOrCreate(
                        ['store_id' => $store->id, 'name' => 'Marketplace settlement deductions'],
                        ['description' => 'Fees and adjustments withheld by marketplace payouts.', 'is_active' => true],
                    );
                    if (! $category->is_active) {
                        $category->update(['is_active' => true]);
                    }
                    $this->expenses->handle(
                        $store,
                        $actor,
                        $category->id,
                        $clearing->id,
                        $deductions,
                        $date->toISOString(),
                        $notes,
                        hash('sha256', 'marketplace-settlement-expense:'.$idempotencyKey),
                    );
                }

                return $settlement;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn () => MarketplaceSettlement::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->first(), $requestHash, $exception);
        }
    }
}
