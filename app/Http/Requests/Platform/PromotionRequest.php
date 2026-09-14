<?php

namespace App\Http\Requests\Platform;

use App\Enums\PromotionFrequency;
use App\Enums\PromotionLocale;
use App\Enums\PromotionPlacement;
use App\Enums\PromotionStatus;
use App\Models\Promotion;
use App\Support\PlatformPermission;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PromotionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(PlatformPermission::PROMOTIONS_MANAGE) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $isCreate = $this->route('promotion') === null;

        return [
            'name' => ['required', 'string', 'max:160'],
            'placement' => ['required', Rule::enum(PromotionPlacement::class)],
            'locale' => ['required', Rule::enum(PromotionLocale::class)],
            'image' => [$isCreate ? 'required' : 'nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'destination_url' => ['nullable', 'string', 'max:2048', $this->safeDestinationUrl(...)],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'status' => ['required', Rule::enum(PromotionStatus::class)],
            'frequency' => [
                Rule::requiredIf($this->input('placement') === PromotionPlacement::AppOpen->value),
                Rule::prohibitedIf($this->input('placement') !== PromotionPlacement::AppOpen->value),
                'nullable',
                Rule::enum(PromotionFrequency::class),
            ],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['placement', 'image'])) {
                return;
            }

            $placement = PromotionPlacement::tryFrom((string) $this->input('placement'));
            $dimensions = $this->imageDimensions();
            if ($placement === null || $dimensions === null) {
                $validator->errors()->add('image', __('Poster image could not be read.'));

                return;
            }

            [$width, $height] = $dimensions;
            if ($placement === PromotionPlacement::DashboardBanner && ($width <= $height || $width < 1280)) {
                $validator->errors()->add('image', __('Dashboard banner must be a landscape image at least 1280px wide.'));
            }
            if ($placement === PromotionPlacement::AppOpen && ($height <= $width || $width < 900)) {
                $validator->errors()->add('image', __('App Open poster must be a portrait image at least 900px wide.'));
            }
        }];
    }

    protected function prepareForValidation(): void
    {
        $destination = trim((string) $this->input('destination_url', ''));
        $this->merge([
            'name' => trim((string) $this->input('name', '')),
            'destination_url' => $destination === '' ? null : $destination,
            'frequency' => $this->input('placement') === PromotionPlacement::AppOpen->value
                ? $this->input('frequency')
                : null,
        ]);
    }

    private function safeDestinationUrl(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            return;
        }

        if (preg_match('/[\\x00-\\x1F\\x7F\\\\]/', $value) === 1) {
            $fail(__('The destination must be an internal path or a valid HTTP(S) URL.'));

            return;
        }

        if (str_starts_with($value, '/') && ! str_starts_with($value, '//')) {
            return;
        }

        $scheme = parse_url($value, PHP_URL_SCHEME);
        $host = parse_url($value, PHP_URL_HOST);
        if (
            filter_var($value, FILTER_VALIDATE_URL) !== false
            && is_string($scheme)
            && in_array(strtolower($scheme), ['http', 'https'], true)
            && is_string($host)
            && $host !== ''
        ) {
            return;
        }

        $fail(__('The destination must be an internal path or a valid HTTP(S) URL.'));
    }

    /** @return array{int,int}|null */
    private function imageDimensions(): ?array
    {
        if ($this->hasFile('image')) {
            $size = @getimagesize($this->file('image')->getRealPath());

            return $size === false ? null : [$size[0], $size[1]];
        }

        $promotion = $this->route('promotion');
        if (! $promotion instanceof Promotion || ! Storage::disk('local')->exists($promotion->image_path)) {
            return null;
        }

        $size = @getimagesize(Storage::disk('local')->path($promotion->image_path));

        return $size === false ? null : [$size[0], $size[1]];
    }
}
