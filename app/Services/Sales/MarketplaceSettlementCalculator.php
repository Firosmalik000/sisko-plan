<?php

namespace App\Services\Sales;

use App\Support\Decimal;
use Illuminate\Validation\ValidationException;

class MarketplaceSettlementCalculator
{
    /** @return array{gross:string,fees:string,other_deductions:string,net:string} */
    public function calculate(string $gross, string $fees, string $otherDeductions): array
    {
        if (Decimal::compare($gross, '0', Decimal::MONEY_SCALE) <= 0
            || Decimal::compare($fees, '0', Decimal::MONEY_SCALE) < 0
            || Decimal::compare($otherDeductions, '0', Decimal::MONEY_SCALE) < 0) {
            throw ValidationException::withMessages(['amount' => __('Settlement amounts are invalid.')]);
        }
        $net = Decimal::subtract(Decimal::subtract($gross, $fees, Decimal::MONEY_SCALE), $otherDeductions, Decimal::MONEY_SCALE);
        if (Decimal::compare($net, '0', Decimal::MONEY_SCALE) <= 0) {
            throw ValidationException::withMessages(['fee_amount' => __('Settlement deductions must be lower than the gross amount.')]);
        }

        return [
            'gross' => Decimal::add($gross, '0', Decimal::MONEY_SCALE),
            'fees' => Decimal::add($fees, '0', Decimal::MONEY_SCALE),
            'other_deductions' => Decimal::add($otherDeductions, '0', Decimal::MONEY_SCALE),
            'net' => $net,
        ];
    }
}
