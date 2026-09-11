<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\UserStatus;
use App\Exceptions\Auth\SocialTokenException;
use App\Http\Requests\Api\V1\Auth\SocialTokenRequest;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\UserSocialIdentity;
use App\Services\Auth\SocialCredential;
use App\Services\Auth\SocialTokenVerifier;
use App\Support\Authentication\IssuesDeviceTokens;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Login sosial mobile: verifikasi credential server-side lalu terbitkan token
 * per-perangkat (Req 3). Identitas disimpan di user_social_identities dengan
 * kunci (provider, provider_subject); linking eksplisit mencegah takeover.
 */
class SocialTokenController
{
    use IssuesDeviceTokens;

    public function __construct(private StartDefaultSubscription $subscriptions) {}

    /**
     * POST /auth/social/google
     */
    public function google(SocialTokenRequest $request, SocialTokenVerifier $verifier): JsonResponse
    {
        return $this->handle($request, $verifier->verify('google', $request->validated()['identity_token']));
    }

    /**
     * POST /auth/social/apple
     */
    public function apple(SocialTokenRequest $request, SocialTokenVerifier $verifier): JsonResponse
    {
        return $this->handle($request, $verifier->verify('apple', $request->validated()['identity_token']));
    }

    /**
     * Resolusi user dari credential terverifikasi lalu terbitkan token.
     */
    private function handle(SocialTokenRequest $request, SocialCredential $credential): JsonResponse
    {
        $validated = $request->validated();

        $user = $this->resolveUser($credential);

        if ($user->status !== UserStatus::Active || $user->isPlatformAdmin()) {
            throw ValidationException::withMessages([
                'identity_token' => [__('auth.failed')],
            ]);
        }

        return ApiResponse::success($this->issueDeviceTokenPayload(
            $user,
            $validated['device_id'],
            $validated['device_name'] ?? null,
        ));
    }

    /**
     * Cari identitas sosial; tautkan ke akun email terverifikasi bila cocok;
     * atau buat akun baru. provider_subject adalah kunci utama (cegah takeover).
     */
    private function resolveUser(SocialCredential $credential): User
    {
        return DB::transaction(function () use ($credential): User {
            $identity = UserSocialIdentity::query()
                ->where('provider', $credential->provider)
                ->where('provider_subject', $credential->subject)
                ->lockForUpdate()
                ->first();

            if ($identity !== null) {
                return $identity->user()->lockForUpdate()->firstOrFail();
            }

            $email = $credential->email;

            // Tanpa email terverifikasi, tidak boleh menautkan/membuat akun
            // (mencegah account takeover, Req 3.5).
            if ($email === null || ! $credential->emailVerified) {
                throw new SocialTokenException('Email dari penyedia identitas belum terverifikasi.');
            }

            /** @var User|null $existing */
            $existing = User::query()->where('email', $email)->lockForUpdate()->first();

            if ($existing !== null) {
                $this->linkIdentity($existing, $credential);

                return $existing;
            }

            $user = User::query()->create([
                'name' => $this->resolvedName($credential, $email),
                'email' => $email,
                'password' => Str::password(64),
                'email_verified_at' => now(),
                'status' => UserStatus::Active,
            ]);

            $this->linkIdentity($user, $credential);
            $this->subscriptions->handle($user);

            return $user;
        });
    }

    private function linkIdentity(User $user, SocialCredential $credential): void
    {
        UserSocialIdentity::query()->create([
            'user_id' => $user->id,
            'provider' => $credential->provider,
            'provider_subject' => $credential->subject,
            'email' => $credential->email,
        ]);
    }

    private function resolvedName(SocialCredential $credential, string $email): string
    {
        $name = trim((string) $credential->name);

        return Str::limit($name !== '' ? $name : Str::before($email, '@'), 255, '');
    }
}
