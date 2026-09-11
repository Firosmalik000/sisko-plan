<?php

namespace App\Services\Auth;

use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Exceptions\Auth\SocialTokenException;
use App\Models\User;
use App\Models\UserSocialIdentity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Resolusi user dari credential sosial terverifikasi, dipakai bersama oleh
 * login web (Socialite redirect) dan login mobile (token). Sumber kebenaran
 * identitas adalah `user_social_identities` dengan kunci (provider,
 * provider_subject); linking eksplisit mencegah account takeover (Req 3.5, D-003).
 *
 * Service ini TIDAK mengurus session/2FA/authorization login — itu tetap milik
 * masing-masing entrypoint (web controller / mobile controller).
 */
class ResolveSocialUser
{
    public function __construct(private StartDefaultSubscription $subscriptions) {}

    /**
     * Kembalikan (dan bila perlu buat/tautkan) user untuk credential ini.
     *
     * @throws SocialTokenException bila email tidak terverifikasi.
     */
    public function handle(SocialCredential $credential): User
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
            ]);

            $this->linkIdentity($user, $credential);
            $this->subscriptions->handle($user);

            return $user;
        });
    }

    private function linkIdentity(User $user, SocialCredential $credential): void
    {
        UserSocialIdentity::query()->firstOrCreate(
            [
                'provider' => $credential->provider,
                'provider_subject' => $credential->subject,
            ],
            [
                'user_id' => $user->id,
                'email' => $credential->email,
            ],
        );
    }

    private function resolvedName(SocialCredential $credential, string $email): string
    {
        $name = trim((string) $credential->name);

        return Str::limit($name !== '' ? $name : Str::before($email, '@'), 255, '');
    }
}
