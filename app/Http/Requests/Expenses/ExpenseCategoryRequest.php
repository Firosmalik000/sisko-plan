<?php

namespace App\Http\Requests\Expenses;

use App\Models\ExpenseCategory;
use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ExpenseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manageExpenses', app(CurrentStore::class)->get());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $category = $this->route('expenseCategory');
        $categoryId = $category instanceof ExpenseCategory ? $category->id : null;

        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('expense_categories')->where('store_id', app(CurrentStore::class)->id())->ignore($categoryId)],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
