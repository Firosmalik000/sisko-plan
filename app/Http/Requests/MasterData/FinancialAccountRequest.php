<?php

namespace App\Http\Requests\MasterData;

use App\Enums\FinancialAccountType;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class FinancialAccountRequest extends MasterDataRequest
{
    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        return [
            'name' => [
                'required', 'string', 'max:120',
                Rule::unique('financial_accounts')->where('store_id', app(CurrentStore::class)->id())
                    ->ignore($this->routeModelId('financial_accounts', 'financialAccount')),
            ],
            'type' => ['required', Rule::enum(FinancialAccountType::class)],
            'account_number' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
