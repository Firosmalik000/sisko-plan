<?php

namespace App\Http\Resources\Api\V1\Finance;

use App\Models\FinancialAccount;
use App\Support\Decimal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi akun keuangan + saldo untuk domain Finance (Req 13.4).
 *
 * Saldo diambil via kolom join `balance` (COALESCE 0) dari
 * `financial_account_balances`; selalu string decimal scale 4 (tanpa float).
 *
 * @mixin FinancialAccount
 */
class FinancialAccountDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $rawBalance = $this->getAttribute('balance');
        $balance = $rawBalance === null
            ? '0.0000'
            : Decimal::add('0', (string) $rawBalance, Decimal::MONEY_SCALE);

        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'type' => $this->type->value,
            'account_number' => $this->account_number,
            'notes' => $this->notes,
            'balance' => $balance,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
