<?php

namespace App\Http\Requests\Sales;

use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

abstract class SaleRequest extends FormRequest
{
    protected string $ability = 'manageSales';

    public function authorize(): bool
    {
        return Gate::allows($this->ability, app(CurrentStore::class)->get());
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
