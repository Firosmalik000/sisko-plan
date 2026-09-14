<?php

namespace App\Http\Controllers;

use App\Models\Promotion;
use App\Services\Promotions\PromotionDelivery;
use App\Support\LocaleContext;
use App\Support\PlatformPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PromotionImageController extends Controller
{
    public function __invoke(Request $request, Promotion $promotion, PromotionDelivery $delivery): StreamedResponse
    {
        $user = $request->user();
        abort_if($user === null, 403);

        if ($user->isPlatformAdmin()) {
            abort_unless($user->can(PlatformPermission::PROMOTIONS_VIEW), 403);
        } else {
            abort_unless($delivery->isDeliverable($promotion, LocaleContext::locale($request)), 404);
        }

        abort_unless(Storage::disk('local')->exists($promotion->image_path), 404);

        return Storage::disk('local')->response($promotion->image_path, null, [
            'Cache-Control' => 'private, max-age=86400, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
