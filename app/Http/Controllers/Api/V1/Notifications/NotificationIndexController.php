<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Enums\NotificationCategory;
use App\Http\Resources\Api\V1\NotificationResource;
use App\Http\Responses\ApiResponse;
use App\Models\MobileNotification;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * GET /stores/{store}/notifications — isi notification center store-scoped
 * (design §10, Req 15.2).
 *
 * Controller tipis: ability gate `store.read` + query store-scoped + cursor
 * pagination + filter opsional `category`. Membership sudah divalidasi
 * middleware `store.membership`. Menampilkan notifikasi tingkat toko
 * (`user_id` null) maupun yang ditujukan ke user saat ini.
 */
class NotificationIndexController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function __invoke(Request $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }

        $limit = $this->resolveLimit($request);
        $userId = $request->user()->id;

        $query = MobileNotification::query()
            ->where('store_id', $store->id)
            ->where(function ($scope) use ($userId): void {
                $scope->whereNull('user_id')->orWhere('user_id', $userId);
            })
            ->orderByDesc('id');

        $category = $request->query('category');
        if (is_string($category) && $category !== '') {
            $enum = NotificationCategory::tryFrom($category);
            if ($enum === null) {
                return ApiResponse::error(
                    'VALIDATION_ERROR',
                    'Kategori notifikasi tidak dikenal.',
                    ['category' => ['Kategori harus salah satu dari operational, promo, security.']],
                    status: 422,
                );
            }
            $query->where('category', $enum->value);
        }

        $page = $query->cursorPaginate($limit);

        return ApiResponse::success([
            'notifications' => NotificationResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        if ($limit < 1) {
            return self::DEFAULT_LIMIT;
        }

        return min($limit, self::MAX_LIMIT);
    }
}
