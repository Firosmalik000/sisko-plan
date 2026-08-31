<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Fortify\Events\TwoFactorAuthenticationChallenged;
use Laravel\Socialite\AbstractUser as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Throwable;

class GoogleAuthenticationController extends Controller
{
    public function redirect(): RedirectResponse
    {
        $this->ensureGoogleIsConfigured();

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $this->ensureGoogleIsConfigured();

        try {
            $googleUser = Socialite::driver('google')->user();
            if (! $googleUser instanceof SocialiteUser) {
                throw new GoogleAuthenticationException('Respons akun Google tidak valid.');
            }
            $user = $this->resolveUser($googleUser);
        } catch (GoogleAuthenticationException $exception) {
            return to_route('login')->with('oauth_error', $exception->getMessage());
        } catch (Throwable $exception) {
            report($exception);

            return to_route('login')->with('oauth_error', 'Login Google tidak dapat diselesaikan. Silakan coba lagi.');
        }

        if ($user->status !== UserStatus::Active) {
            return to_route('login')->with('oauth_error', 'Akun Anda sedang dinonaktifkan.');
        }

        if ($user->isPlatformAdmin()) {
            return to_route('login')->with('oauth_error', 'Admin platform harus masuk menggunakan metode utama.');
        }

        if ($user->hasEnabledTwoFactorAuthentication()) {
            $request->session()->put([
                'login.id' => $user->getKey(),
                'login.remember' => true,
            ]);
            TwoFactorAuthenticationChallenged::dispatch($user);

            return to_route('two-factor.login');
        }

        Auth::guard('web')->login($user, true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    private function resolveUser(SocialiteUser $googleUser): User
    {
        $googleId = trim((string) $googleUser->getId());
        $email = Str::lower(trim((string) $googleUser->getEmail()));
        $raw = $googleUser->getRaw();
        $verified = filter_var($raw['email_verified'] ?? $raw['verified_email'] ?? false, FILTER_VALIDATE_BOOL);

        if ($googleId === '' || $email === '' || ! $verified) {
            throw new GoogleAuthenticationException('Google tidak memberikan email terverifikasi.');
        }

        return DB::transaction(function () use ($googleUser, $googleId, $email): User {
            $linkedUser = User::query()->where('google_id', $googleId)->lockForUpdate()->first();
            if ($linkedUser !== null) {
                return $linkedUser;
            }

            $user = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => $this->resolvedName($googleUser, $email),
                    'password' => Str::password(64),
                    'email_verified_at' => now(),
                    'status' => UserStatus::Active,
                ],
            );
            $user = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($user->status !== UserStatus::Active) {
                throw new GoogleAuthenticationException('Akun Anda sedang dinonaktifkan.');
            }

            if ($user->isPlatformAdmin()) {
                throw new GoogleAuthenticationException('Admin platform harus masuk menggunakan metode utama.');
            }

            if ($user->google_id !== null && $user->google_id !== $googleId) {
                throw new GoogleAuthenticationException('Email ini sudah terhubung ke akun Google lain.');
            }

            $user->forceFill([
                'google_id' => $googleId,
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();

            return $user;
        });
    }

    private function resolvedName(SocialiteUser $googleUser, string $email): string
    {
        $name = trim((string) $googleUser->getName());

        return Str::limit($name !== '' ? $name : Str::before($email, '@'), 255, '');
    }

    private function ensureGoogleIsConfigured(): void
    {
        abort_unless(
            config('services.google.enabled')
            && filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret')),
            404,
        );
    }
}
