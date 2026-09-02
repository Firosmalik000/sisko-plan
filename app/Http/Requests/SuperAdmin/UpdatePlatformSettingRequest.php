<?php

namespace App\Http\Requests\SuperAdmin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlatformSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'brand_name' => ['required', 'string', 'max:100'],
            'tagline' => ['nullable', 'string', 'max:160'],
            'site_url' => ['nullable', 'url:http,https', 'max:2048'],
            'support_email' => ['nullable', 'email', 'max:255'],
            'support_phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+().\-\s]+$/'],
            'social_links' => ['present', 'array', 'max:25'],
            'social_links.*.platform' => ['required', 'string', 'max:40'],
            'social_links.*.url' => ['required', 'url:http,https', 'max:2048'],
            'seo_title' => ['required', 'string', 'max:60'],
            'seo_description' => ['nullable', 'string', 'max:160'],
            'seo_keywords' => ['nullable', 'string', 'max:500'],
            'social_image_url' => ['nullable', 'url:http,https', 'max:2048'],
            'robots_index' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $rawLinks = $this->input('social_links', []);
        $links = [];

        if (is_array($rawLinks)) {
            foreach ($rawLinks as $link) {
                if (! is_array($link) || (! filled($link['platform'] ?? null) && ! filled($link['url'] ?? null))) {
                    continue;
                }

                $links[] = [
                    'platform' => trim((string) ($link['platform'] ?? '')),
                    'url' => trim((string) ($link['url'] ?? '')),
                ];
            }
        }

        $this->merge([
            'brand_name' => trim((string) $this->input('brand_name', '')),
            'tagline' => $this->trimmedOrNull('tagline'),
            'site_url' => $this->trimmedOrNull('site_url'),
            'support_email' => $this->trimmedOrNull('support_email'),
            'support_phone' => $this->trimmedOrNull('support_phone'),
            'social_links' => $links,
            'seo_title' => trim((string) $this->input('seo_title', '')),
            'seo_description' => $this->trimmedOrNull('seo_description'),
            'seo_keywords' => $this->trimmedOrNull('seo_keywords'),
            'social_image_url' => $this->trimmedOrNull('social_image_url'),
        ]);
    }

    private function trimmedOrNull(string $key): ?string
    {
        $value = trim((string) $this->input($key, ''));

        return $value === '' ? null : $value;
    }
}
