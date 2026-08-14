<?php

namespace App\Http\Requests\Operations;

use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class AccountTransferRequest extends LedgerRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $account = Rule::exists('financial_accounts', 'public_id')->where('store_id', app(CurrentStore::class)->id());

        return [
            ...$this->commonRules(),
            'from_account_id' => ['required', $account],
            'to_account_id' => ['required', 'different:from_account_id', Rule::exists('financial_accounts', 'public_id')->where('store_id', app(CurrentStore::class)->id())],
            'amount' => ['required', 'decimal:0,4', 'gt:0'],
        ];
    }
}
