<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Subscriptions\StartDefaultSubscription;
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
    public function __construct(private StartDefaultSubscription $subscriptions) {}

    public function redirect(): RedirectResponse
    {
        if (! $this->googleIsConfigured()) {
            return to_route('login')->with('oauth_error', __('Google sign-in has not been configured.'));
        }

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if (! $this->googleIsConfigured()) {
            return to_route('login')->with('oauth_error', __('Google sign-in has not been configured.'));
        }

        try {
            $googleUser = Socialite::driver('google')->user();
            if (! $googleUser instanceof SocialiteUser) {
                throw new GoogleAuthenticationException(__('The Google account response is invalid.'));
            }
            $user = $this->resolveUser($googleUser);
        } catch (GoogleAuthenticationException $exception) {
            return to_route('login')->with('oauth_error', $exception->getMessage());
        } catch (Throwable $exception) {
            report($exception);

            return to_route('login')->with('oauth_error', __('Google sign-in could not be completed. Please try again.'));
        }

        if ($user->status !== UserStatus::Active) {
            return to_route('login')->with('oauth_error', __('Your account is currently deactivated.'));
        }

        if ($user->isPlatformAdmin()) {
            return to_route('login')->with('oauth_error', __('Platform administrators must sign in using the primary method.'));
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
            throw new GoogleAuthenticationException(__('Google did not provide a verified email address.'));
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
                throw new GoogleAuthenticationException(__('Your account is currently deactivated.'));
            }

            if ($user->isPlatformAdmin()) {
                throw new GoogleAuthenticationException(__('Platform administrators must sign in using the primary method.'));
            }

            if ($user->google_id !== null && $user->google_id !== $googleId) {
                throw new GoogleAuthenticationException(__('This email address is already linked to another Google account.'));
            }

            $user->forceFill([
                'google_id' => $googleId,
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();
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
