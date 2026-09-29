<?php

namespace App\Http\Requests\Operations;

use App\Enums\StockCountFrequency;
use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rules\Enum;

class StartStockCountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manageStockCounts', app(CurrentStore::class)->get());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:500'],
            'frequency' => ['nullable', new Enum(StockCountFrequency::class)],
        ];
    }
}
