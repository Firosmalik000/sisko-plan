<?php

namespace App\Http\Requests\Operations;

use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

abstract class LedgerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manageOperations', app(CurrentStore::class)->get());
    }

    /** @return array<string, list<string>> */
    protected function commonRules(): array
    {
        return [
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'idempotency_key' => ['required', 'uuid'],
        ];
    }
}
