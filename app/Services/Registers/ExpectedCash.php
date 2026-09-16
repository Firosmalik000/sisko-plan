<?php

namespace App\Services\Registers;

use App\Models\CashTransaction;
use App\Models\RegisterDrawerMovement;
use App\Models\RegisterSession;
use App\Support\Decimal;

class ExpectedCash
{
    public function for(RegisterSession $session): string
    {
        $expected = (string) $session->opening_cash;
        RegisterDrawerMovement::query()->where('register_session_id', $session->id)->orderBy('id')
            ->each(function (RegisterDrawerMovement $movement) use (&$expected): void {
                $expected = $movement->direction === 'cash_in'
                    ? Decimal::add($expected, (string) $movement->amount, Decimal::MONEY_SCALE)
                    : Decimal::subtract($expected, (string) $movement->amount, Decimal::MONEY_SCALE);
            });
        CashTransaction::query()->where('register_session_id', $session->id)
            ->whereIn('reason', ['sale_payment', 'sale_refund'])->orderBy('id')
            ->each(function (CashTransaction $transaction) use (&$expected): void {
                $expected = $transaction->direction === 'in'
                    ? Decimal::add($expected, (string) $transaction->amount, Decimal::MONEY_SCALE)
                    : Decimal::subtract($expected, (string) $transaction->amount, Decimal::MONEY_SCALE);
            });

        return $expected;
    }
}
