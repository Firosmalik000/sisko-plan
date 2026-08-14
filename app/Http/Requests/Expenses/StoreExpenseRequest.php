<?php

namespace App\Http\Requests\Expenses;

use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manageExpenses', app(CurrentStore::class)->get());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();

        return [
            'category_id' => ['required', Rule::exists('expense_categories', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'account_id' => ['required', Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'amount' => ['required', 'decimal:0,4', 'gt:0', 'lte:999999999999999.9999'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'idempotency_key' => ['required', 'uuid'],
        ];
    }
}
