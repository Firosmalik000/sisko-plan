<?php

namespace App\Http\Requests\Purchasing;

use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

abstract class PurchasingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('managePurchasing', app(CurrentStore::class)->get());
    }

    /** @return array<string, list<string>> */
    protected function postingRules(): array
    {
        return [
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'idempotency_key' => ['required', 'uuid'],
        ];
    }
}
