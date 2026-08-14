<?php

namespace App\Http\Requests\Operations;

use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class OpeningCashRequest extends LedgerRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...$this->commonRules(),
            'account_id' => ['required', Rule::exists('financial_accounts', 'public_id')->where('store_id', app(CurrentStore::class)->id())],
            'amount' => ['required', 'decimal:0,4', 'gt:0'],
        ];
    }
}
