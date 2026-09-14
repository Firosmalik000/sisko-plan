<?php

namespace App\Support\Referrals;

use App\Models\ReferralCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use JsonException;

final class ReferralIntent
{
    public const SESSION_KEY = 'referral.intent';

    public const COOKIE_NAME = 'sisko_referral_intent';

    public const WINDOW_DAYS = 30;

    private const WINDOW_MINUTES = self::WINDOW_DAYS * 24 * 60;

    public function remember(Request $request, ReferralCode $code): void
    {
        if ($this->resolve($request) !== null) {
            return;
        }

        $payload = ['code' => $code->code, 'remembered_at' => now()->timestamp];
        $request->session()->put(self::SESSION_KEY, $payload);
        Cookie::queue(
            self::COOKIE_NAME,
            json_encode($payload, JSON_THROW_ON_ERROR),
            self::WINDOW_MINUTES,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            'lax',
        );
    }

    public function resolve(Request $request): ?ReferralCode
    {
        $sessionPayload = $request->session()->get(self::SESSION_KEY);
        $cookieValue = $request->cookie(self::COOKIE_NAME);
        $cookiePayload = is_string($cookieValue) ? $this->decode($cookieValue) : null;

        foreach ([$sessionPayload, $cookiePayload] as $payload) {
            if (! $this->valid($payload)) {
                continue;
            }

            $code = ReferralCode::query()->where('code', Str::upper($payload['code']))->first();
            if ($code !== null) {
                $request->session()->put(self::SESSION_KEY, [
                    'code' => $code->code,
                    'remembered_at' => $payload['remembered_at'],
                ]);

                return $code;
            }
        }

        if ($sessionPayload !== null || $cookieValue !== null) {
            $this->forget($request);
        }

        return null;
    }

    public function forget(Request $request): void
    {
        $request->session()->forget(self::SESSION_KEY);
        Cookie::queue(Cookie::forget(self::COOKIE_NAME));
    }

    /** @return array{code:string,remembered_at:int}|null */
    private function decode(string $value): ?array
    {
        try {
            $payload = json_decode($value, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        return $this->valid($payload) ? $payload : null;
    }

    private function valid(mixed $payload): bool
    {
        if (! is_array($payload) || ! is_string($payload['code'] ?? null) || ! is_int($payload['remembered_at'] ?? null)) {
            return false;
        }

        $rememberedAt = $payload['remembered_at'];

        return $payload['code'] !== ''
            && $rememberedAt <= now()->timestamp
            && $rememberedAt >= now()->subDays(self::WINDOW_DAYS)->timestamp;
    }
}
