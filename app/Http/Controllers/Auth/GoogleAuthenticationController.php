<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserSocialIdentity;
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
    public function __construct(private StartDefaultSubscription $subscriptions) {}

    public function redirect(): RedirectResponse
    {
        if (! $this->googleIsConfigured()) {
            return to_route('login')->with('oauth_error', __('Login Google belum dikonfigurasi.'));
        }

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if (! $this->googleIsConfigured()) {
            return to_route('login')->with('oauth_error', __('Login Google belum dikonfigurasi.'));
        }

        try {
            $googleUser = Socialite::driver('google')->user();
            if (! $googleUser instanceof SocialiteUser) {
                throw new GoogleAuthenticationException(__('Respons akun Google tidak valid.'));
            }
            $user = $this->resolveUser($googleUser);
        } catch (GoogleAuthenticationException $exception) {
            return to_route('login')->with('oauth_error', $exception->getMessage());
        } catch (Throwable $exception) {
            report($exception);

            return to_route('login')->with('oauth_error', __('Login Google tidak dapat diselesaikan. Silakan coba lagi.'));
        }

        if ($user->status !== UserStatus::Active) {
            return to_route('login')->with('oauth_error', __('Akun Anda sedang dinonaktifkan.'));
        }

        if ($user->isPlatformAdmin()) {
            return to_route('login')->with('oauth_error', __('Admin platform harus masuk menggunakan metode utama.'));
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
            throw new GoogleAuthenticationException(__('Google tidak memberikan email terverifikasi.'));
        }

        return DB::transaction(function () use ($googleUser, $googleId, $email): User {
            // Sumber kebenaran identitas: user_social_identities (provider, provider_subject).
            $identity = UserSocialIdentity::query()
                ->where('provider', 'google')
                ->where('provider_subject', $googleId)
                ->lockForUpdate()
                ->first();

            if ($identity !== null) {
                return $identity->user()->lockForUpdate()->firstOrFail();
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
                throw new GoogleAuthenticationException(__('Akun Anda sedang dinonaktifkan.'));
            }

            if ($user->isPlatformAdmin()) {
                throw new GoogleAuthenticationException(__('Admin platform harus masuk menggunakan metode utama.'));
            }

            // Cegah tautan ganda: email sudah tertaut ke subject Google lain.
            $conflicting = UserSocialIdentity::query()
                ->where('provider', 'google')
                ->where('user_id', $user->id)
                ->where('provider_subject', '!=', $googleId)
                ->exists();

            if ($conflicting) {
                throw new GoogleAuthenticationException(__('Email ini sudah terhubung ke akun Google lain.'));
            }

            UserSocialIdentity::query()->firstOrCreate(
                ['provider' => 'google', 'provider_subject' => $googleId],
                ['user_id' => $user->id, 'email' => $email],
            );

            if ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            $this->subscriptions->handle($user);

            return $user;
        });
    }

    private function resolvedName(SocialiteUser $googleUser, string $email): string
    {
        $name = trim((string) $googleUser->getName());

        return Str::limit($name !== '' ? $name : Str::before($email, '@'), 255, '');
    }

    private function googleIsConfigured(): bool
    {
        return (bool) config('services.google.enabled')
            && filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'));
    }
}
