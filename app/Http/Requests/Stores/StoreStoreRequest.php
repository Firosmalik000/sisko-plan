<?php

namespace App\Http\Requests\Stores;

use App\Models\Country;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\LocaleContext;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStoreRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->filled('country')) {
            $market = LocaleContext::market($this);
            $country = Country::query()->where(['code' => $market, 'is_active' => true])->value('code')
                ?? Country::query()->where(['code' => 'ID', 'is_active' => true])->value('code')
                ?? Country::query()->where('is_active', true)->orderBy('name')->value('code');
            $this->merge(['country' => $country]);
        }
    }

    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this) !== null;
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        $country = strtoupper((string) $this->input('country'));
        $timezones = Country::query()->where('code', $country)->first()?->timezones() ?? [];

        return [
            'name' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:500'],
            'country' => [
                'required',
                'string',
                Rule::exists('countries', 'code')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'timezone' => ['nullable', 'string', Rule::in($timezones)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'address.string' => __('The store address must be text.'),
            'address.max' => __('The store address must not exceed 500 characters.'),
            'timezone.in' => __('The time zone is unavailable for this store country.'),
        ];
    }
}
