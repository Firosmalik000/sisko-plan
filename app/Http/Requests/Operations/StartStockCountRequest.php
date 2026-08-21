<?php

namespace App\Http\Requests\Operations;

use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StartStockCountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manageStockCounts', app(CurrentStore::class)->get());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['notes' => ['nullable', 'string', 'max:500']];
    }
}
