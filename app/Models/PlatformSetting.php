<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

#[Fillable([
    'brand_name',
    'logo_path',
    'logo_dark_path',
    'logo_contrast_path',
    'logo_monochrome_path',
    'mark_path',
    'mark_dark_path',
    'mark_monochrome_path',
    'tagline',
    'site_url',
    'support_email',
    'support_phone',
    'social_links',
    'seo_title',
    'seo_description',
    'seo_keywords',
    'social_image_url',
    'robots_index',
])]
class PlatformSetting extends Model
{
    public const SINGLETON_ID = 1;

    public static function current(): self
    {
        if (! Schema::hasTable('platform_settings')) {
            return new self(self::defaults());
        }

        return self::query()->find(self::SINGLETON_ID) ?? new self(self::defaults());
    }

    /** @return array<string, mixed> */
    public static function defaults(): array
    {
        return [
            'brand_name' => config('app.name', 'Sisko Plan'),
            'logo_path' => null,
            'logo_dark_path' => null,
            'logo_contrast_path' => null,
            'logo_monochrome_path' => null,
            'mark_path' => null,
            'mark_dark_path' => null,
            'mark_monochrome_path' => null,
            'tagline' => 'Scan barangnya. Sisanya langsung tercatat.',
            'site_url' => config('app.url'),
            'support_email' => null,
            'support_phone' => null,
            'social_links' => [],
            'seo_title' => 'Scan Products, Manage Your Store Faster',
            'seo_description' => 'Scan products, record transactions, update stock, and monitor store reports in one workflow.',
            'seo_keywords' => null,
            'social_image_url' => null,
            'robots_index' => true,
        ];
    }

    /** @return array<string, mixed> */
    public function publicPayload(): array
    {
        return [
            'brand_name' => $this->brand_name,
            'logo_url' => $this->logo_path
                ? route('platform.logo', ['v' => substr(hash('sha256', $this->logo_path), 0, 12)])
                : null,
            'logos' => [
                'primary' => $this->resolveLogoUrl('primary'),
                'dark' => $this->resolveLogoUrl('dark'),
                'dark_contrast' => $this->resolveLogoUrl('dark_contrast'),
                'monochrome' => $this->resolveLogoUrl('monochrome'),
                'mark' => $this->resolveLogoUrl('mark'),
                'mark_dark' => $this->resolveLogoUrl('mark_dark'),
                'mark_monochrome' => $this->resolveLogoUrl('mark_monochrome'),
            ],
            'custom_logos' => [
                'primary' => $this->customLogoUrl('primary'),
                'dark' => $this->customLogoUrl('dark'),
                'dark_contrast' => $this->customLogoUrl('dark_contrast'),
                'monochrome' => $this->customLogoUrl('monochrome'),
                'mark' => $this->customLogoUrl('mark'),
                'mark_dark' => $this->customLogoUrl('mark_dark'),
                'mark_monochrome' => $this->customLogoUrl('mark_monochrome'),
            ],
            'tagline' => $this->tagline,
            'site_url' => $this->site_url,
            'support_email' => $this->support_email,
            'support_phone' => $this->support_phone,
            'social_links' => $this->social_links ?? [],
            'seo_title' => $this->seo_title,
            'seo_description' => $this->seo_description,
            'seo_keywords' => $this->seo_keywords,
            'social_image_url' => $this->social_image_url,
            'robots_index' => $this->robots_index,
        ];
    }

    public function customLogoUrl(string $variant): ?string
    {
        $column = match ($variant) {
            'dark' => 'logo_dark_path',
            'dark_contrast', 'contrast' => 'logo_contrast_path',
            'monochrome' => 'logo_monochrome_path',
            'mark', 'mark_light' => 'mark_path',
            'mark_dark' => 'mark_dark_path',
            'mark_monochrome' => 'mark_monochrome_path',
            default => 'logo_path',
        };

        $path = $this->{$column};

        if (! $path) {
            return null;
        }

        $params = ['v' => substr(hash('sha256', $path), 0, 12)];
        if ($variant !== 'primary') {
            $params['variant'] = $variant;
        }

        return route('platform.logo', $params);
    }

    public function resolveLogoUrl(string $variant): string
    {
        return $this->customLogoUrl($variant) ?? match ($variant) {
            'dark' => '/brand/logo-dark.png',
            'dark_contrast', 'contrast' => '/brand/logo-dark-contrast.png',
            'monochrome' => '/brand/logo-monochrome.png',
            'mark', 'mark_light' => '/brand/mark-light.png',
            'mark_dark' => '/brand/mark-dark.png',
            'mark_monochrome' => '/brand/mark-monochrome.png',
            default => '/brand/logo-light.png',
        };
    }

    protected function casts(): array
    {
        return [
            'social_links' => 'array',
            'robots_index' => 'boolean',
        ];
    }
}
