<?php

namespace App\Actions\Purchasing;

use App\Models\SupplierPayableBalance;
use App\Models\SupplierPayableTransaction;
use App\Models\User;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplySupplierPayable
{
    public function handle(int $storeId, int $supplierId, string $direction, string $amount, string $reason, Model $reference, CarbonInterface $occurredAt, User $actor, ?string $notes): SupplierPayableTransaction
    {
        if (! in_array($direction, ['increase', 'decrease'], true) || Decimal::compare($amount, '0', Decimal::MONEY_SCALE) <= 0) {
            throw ValidationException::withMessages(['amount' => __('The debt amount must be greater than zero.')]);
        }
        DB::table('supplier_payable_balances')->insertOrIgnore([
            'store_id' => $storeId, 'supplier_id' => $supplierId, 'balance' => 0,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $balance = SupplierPayableBalance::query()->where(['store_id' => $storeId, 'supplier_id' => $supplierId])->lockForUpdate()->firstOrFail();
        $latest = SupplierPayableTransaction::query()->where(['store_id' => $storeId, 'supplier_id' => $supplierId])
            ->latest('occurred_at')->latest('id')->lockForUpdate()->first(['occurred_at']);
        if ($latest !== null && $occurredAt->lt(CarbonImmutable::parse((string) $latest->occurred_at))) {
            throw ValidationException::withMessages(['occurred_at' => __("The transaction time cannot be earlier than the supplier's latest debt transaction.")]);
        }
        $signed = $direction === 'increase' ? $amount : Decimal::subtract('0', $amount, Decimal::MONEY_SCALE);
        $newBalance = Decimal::add($balance->balance, $signed, Decimal::MONEY_SCALE);
        if (Decimal::compare($newBalance, '0', Decimal::MONEY_SCALE) < 0) {
            throw ValidationException::withMessages(['amount' => __('The payment exceeds the supplier debt.')]);
        }
        $balance->update(['balance' => $newBalance]);

        return SupplierPayableTransaction::create([
            'store_id' => $storeId, 'supplier_id' => $supplierId, 'direction' => $direction,
            'reason' => $reason, 'amount' => $amount, 'balance_after' => $newBalance,
            'reference_type' => $reference->getMorphClass(), 'reference_id' => $reference->getKey(),
            'occurred_at' => $occurredAt, 'notes' => $notes, 'created_by_user_id' => $actor->id,
        ]);
    }
}
