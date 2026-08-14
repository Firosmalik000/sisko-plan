<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class ReadinessController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $cacheKey = 'readiness:'.Str::random(20);

        try {
            DB::select('select 1');
            Cache::put($cacheKey, 'ready', 10);
            throw_unless(Cache::get($cacheKey) === 'ready', new \RuntimeException('Cache readiness check failed.'));
            Cache::forget($cacheKey);

            return response()->json(['status' => 'ready']);
        } catch (Throwable $exception) {
            try {
                Cache::forget($cacheKey);
            } catch (Throwable) {
                // The failed cache is already represented by the generic readiness response.
            }
            Log::warning('Application readiness check failed.', [
                'exception' => $exception::class,
            ]);

            return response()->json(['status' => 'unavailable'], 503);
        }
    }
}
