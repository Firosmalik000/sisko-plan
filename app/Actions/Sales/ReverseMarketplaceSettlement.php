<?php

namespace App\Actions\Sales;

use App\Actions\Ledgers\ApplyCashTransaction;
use App\Actions\Ledgers\IdempotencyGuard;
use App\Models\BusinessMembership;
use App\Models\MarketplaceSettlement;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReverseMarketplaceSettlement
{
    public function __construct(private ApplyCashTransaction $cash, private IdempotencyGuard $idempotency) {}

    public function handle(MarketplaceSettlement $settlement, BusinessMembership $actor, string $notes, string $idempotencyKey): MarketplaceSettlement
    {
        $store = $settlement->store;
        $actor = BusinessMembership::operational($store, $actor);
        $requestHash = $this->idempotency->hash(['settlement_id' => $settlement->id, 'notes' => $notes]);

        try {
            return DB::transaction(function () use ($settlement, $store, $actor, $notes, $idempotencyKey, $requestHash): MarketplaceSettlement {
                $existing = $this->idempotency->existing(fn () => MarketplaceSettlement::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing instanceof MarketplaceSettlement) {
                    return $existing;
                }
                $original = MarketplaceSettlement::query()->whereKey($settlement->id)->lockForUpdate()->firstOrFail();
                if ($original->reversal_of_settlement_id !== null || MarketplaceSettlement::query()->where('reversal_of_settlement_id', $original->id)->exists()) {
                    throw ValidationException::withMessages(['settlement' => __('This marketplace settlement is already a reversal or has been reversed.')]);
                }
                $reversal = MarketplaceSettlement::create([
                    'store_id' => $original->store_id, 'marketplace_id' => $original->marketplace_id,
                    'clearing_account_id' => $original->clearing_account_id, 'destination_account_id' => $original->destination_account_id,
                    'currency_code' => $original->currency_code, 'gross_amount' => $original->gross_amount,
                    'fee_amount' => $original->fee_amount, 'other_deduction_amount' => $original->other_deduction_amount,
                    'net_amount' => $original->net_amount, 'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash, 'created_by_business_membership_id' => $actor->id,
                    'reversal_of_settlement_id' => $original->id, 'occurred_at' => now(), 'notes' => $notes,
                ]);
                $this->cash->handle($store->id, $original->destination_account_id, 'out', (string) $original->net_amount, 'settlement_reversal', $reversal, now(), $actor, $notes);
                $this->cash->handle($store->id, $original->clearing_account_id, 'in', (string) $original->gross_amount, 'settlement_reversal', $reversal, now(), $actor, $notes);

                return $reversal;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn () => MarketplaceSettlement::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->first(), $requestHash, $exception);
        }
    }
}
