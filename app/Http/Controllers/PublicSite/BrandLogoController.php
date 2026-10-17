<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BrandLogoController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $variant = $request->query('variant', 'primary');
        $column = match ($variant) {
            'dark' => 'logo_dark_path',
            'dark_contrast', 'contrast' => 'logo_contrast_path',
            'monochrome' => 'logo_monochrome_path',
            'mark', 'mark_light' => 'mark_path',
            'mark_dark' => 'mark_dark_path',
            'mark_monochrome' => 'mark_monochrome_path',
            default => 'logo_path',
        };

        $path = PlatformSetting::current()->{$column};

        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'public, max-age=86400, immutable',
        ]);
    }
}
