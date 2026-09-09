<?php

namespace App\Http\Requests\MasterData;

use App\Models\Category;
use App\Support\CurrentStore;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class CategoryRequest extends MasterDataRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->has('name_is_custom')) {
            $existing = Category::query()->where('store_id', app(CurrentStore::class)->id())
                ->where('public_id', $this->route('category'))->first();
            if ($existing === null || $existing->name !== $this->input('name')) {
                $this->merge(['name_is_custom' => true]);
            }
        }
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $categoryId = $this->routeModelId('categories', 'category');
        $existing = $categoryId === null ? null : Category::query()->where('store_id', $storeId)->find($categoryId);

        return [
            'name' => [
                'required', 'string', 'max:120',
                Rule::unique('categories')->where('store_id', app(CurrentStore::class)->id())
                    ->ignore($this->routeModelId('categories', 'category')),
            ],
            'reference_code' => [Rule::requiredIf(fn () => $this->has('name_is_custom') && ! $this->boolean('name_is_custom')), 'nullable', 'string', Rule::exists('category_references', 'code')->where(function ($query) use ($existing): void {
                if ($existing?->reference_code !== $this->input('reference_code')) {
                    $query->where('is_active', true);
                }
            })],
            'description' => ['nullable', 'string', 'max:500'],
            'name_is_custom' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
