<?php

namespace App\Actions\Ledgers;

use App\Models\CashTransaction;
use App\Models\FinancialAccountBalance;
use App\Models\User;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplyCashTransaction
{
    private const MAX_MONEY = '999999999999999.9999';

    public function handle(int $storeId, int $accountId, string $direction, string $amount, string $reason, ?Model $reference, CarbonInterface $occurredAt, User $actor, ?string $notes, ?string $idempotencyKey = null, ?string $requestHash = null, bool $requireEmptyAccount = false): CashTransaction
    {
        if (! in_array($direction, ['in', 'out'], true) || Decimal::compare($amount, '0', Decimal::MONEY_SCALE) <= 0) {
            throw ValidationException::withMessages(['amount' => 'Nominal transaksi harus lebih besar dari nol.']);
        }
        DB::table('financial_account_balances')->insertOrIgnore([
            'store_id' => $storeId, 'financial_account_id' => $accountId, 'balance' => 0,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $balance = FinancialAccountBalance::query()->where(['store_id' => $storeId, 'financial_account_id' => $accountId])->lockForUpdate()->firstOrFail();
        $latestTransaction = CashTransaction::query()->where(['store_id' => $storeId, 'financial_account_id' => $accountId])
            ->latest('occurred_at')->latest('id')->lockForUpdate()->first(['occurred_at']);
        if ($requireEmptyAccount && $latestTransaction !== null) {
            throw ValidationException::withMessages(['account' => 'Saldo awal hanya dapat diposting sebelum akun memiliki transaksi.']);
        }
        if ($latestTransaction !== null && $occurredAt->lt(CarbonImmutable::parse((string) $latestTransaction->occurred_at))) {
            throw ValidationException::withMessages(['occurred_at' => 'Waktu transaksi tidak boleh mendahului transaksi terakhir akun.']);
        }
        $signedAmount = $direction === 'in' ? $amount : Decimal::subtract('0', $amount, Decimal::MONEY_SCALE);
        $newBalance = Decimal::add($balance->balance, $signedAmount, Decimal::MONEY_SCALE);
        if (Decimal::compare($newBalance, '0', Decimal::MONEY_SCALE) < 0) {
            throw ValidationException::withMessages(['amount' => 'Saldo akun tidak mencukupi.']);
        }
        if (Decimal::compare($newBalance, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0) {
            throw ValidationException::withMessages(['amount' => 'Saldo akun melebihi kapasitas nominal yang didukung.']);
        }
        $balance->update(['balance' => $newBalance]);

        return CashTransaction::create([
            'store_id' => $storeId, 'financial_account_id' => $accountId, 'direction' => $direction,
            'reason' => $reason, 'amount' => $amount, 'balance_after' => $newBalance,
            'idempotency_key' => $idempotencyKey,
            'request_hash' => $requestHash,
            'reference_type' => $reference?->getMorphClass(), 'reference_id' => $reference?->getKey(),
            'occurred_at' => $occurredAt, 'notes' => $notes, 'created_by_user_id' => $actor->id,
        ]);
    }
}
