<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

#[Fillable([
    'brand_name',
    'logo_path',
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
            'tagline' => 'Scan barangnya. Sisanya langsung tercatat.',
            'site_url' => config('app.url'),
            'support_email' => null,
            'support_phone' => null,
            'social_links' => [],
            'seo_title' => 'Scan Barang, Kelola Toko Lebih Cepat',
            'seo_description' => 'Scan barang, catat transaksi, perbarui stok, dan pantau laporan toko dalam satu alur.',
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

    protected function casts(): array
    {
        return [
            'social_links' => 'array',
            'robots_index' => 'boolean',
        ];
    }
}
