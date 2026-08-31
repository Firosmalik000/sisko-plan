<?php

namespace Tests\Feature;

use App\Actions\Platform\RecordAdminAudit;
use App\Models\User;
use App\Services\Operations\ProductionReadiness;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;
use PragmaRX\Google2FA\Google2FA;
use RuntimeException;
use Tests\TestCase;

class ProductionReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_admin_password_login_waits_for_valid_totp_before_authentication(): void
    {
        [$admin, $secret] = $this->adminWithTwoFactor();

        $this->post(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('two-factor.login'));

        $this->assertGuest();
        $this->get(route('two-factor.login'))->assertOk();
        $this->post(route('two-factor.login.store'), [
            'code' => app(Google2FA::class)->getCurrentOtp($secret),
        ])->assertRedirect(route('super-admin.dashboard'));

        $this->assertAuthenticatedAs($admin);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'admin.login',
        ]);
    }

    public function test_platform_admin_recovery_code_is_single_use(): void
    {
        [$admin] = $this->adminWithTwoFactor(['recover-once']);
        $this->post(route('login.store'), ['email' => $admin->email, 'password' => 'password']);
        $this->post(route('two-factor.login.store'), ['recovery_code' => 'recover-once'])
            ->assertRedirect(route('super-admin.dashboard'));
        $this->assertNotContains('recover-once', $admin->fresh()->recoveryCodes());

        $this->post(route('super-admin.logout'));
        $this->post(route('login.store'), ['email' => $admin->email, 'password' => 'password']);
        $this->post(route('two-factor.login.store'), ['recovery_code' => 'recover-once'])
            ->assertSessionHasErrors('recovery_code');
        $this->assertGuest();
    }

    public function test_required_platform_admin_two_factor_blocks_direct_navigation_but_allows_setup(): void
    {
        config(['security.platform_admin_2fa_required' => true]);
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->get(route('super-admin.dashboard'))
            ->assertRedirect(route('super-admin.security.index'));
        $this->actingAs($admin)->get(route('super-admin.security.index'))->assertOk();
    }

    public function test_platform_admin_can_enroll_confirm_and_cannot_disable_required_two_factor(): void
    {
        config(['security.platform_admin_2fa_required' => true]);
        $admin = User::factory()->superAdmin()->create();
        $this->actingAs($admin)->post(route('super-admin.security.two-factor.enable'), [
            'current_password' => 'password',
        ])->assertRedirect();
        $admin->refresh();
        $secret = Fortify::currentEncrypter()->decrypt($admin->two_factor_secret);

        $this->actingAs($admin)->post(route('super-admin.security.two-factor.confirm'), [
            'code' => app(Google2FA::class)->getCurrentOtp($secret),
        ])->assertRedirect();

        $this->assertTrue($admin->fresh()->hasEnabledTwoFactorAuthentication());
        $this->assertDatabaseHas('admin_audit_logs', ['user_id' => $admin->id, 'action' => 'admin.2fa_enabled']);
        $this->actingAs($admin)->delete(route('super-admin.security.two-factor.disable'), [
            'current_password' => 'password',
        ])->assertSessionHasErrors('two_factor');
        $this->assertTrue($admin->fresh()->hasEnabledTwoFactorAuthentication());

        config(['security.platform_admin_2fa_required' => false]);
        $this->actingAs($admin)->delete(route('super-admin.security.two-factor.disable'), [
            'current_password' => 'password',
        ])->assertRedirect();
        $this->assertFalse($admin->fresh()->hasEnabledTwoFactorAuthentication());
        $this->assertDatabaseHas('admin_audit_logs', ['user_id' => $admin->id, 'action' => 'admin.2fa_disabled']);
    }

    public function test_two_factor_mutation_rolls_back_when_security_audit_fails(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $this->mock(RecordAdminAudit::class)
            ->shouldReceive('handle')
            ->once()
            ->andThrow(new RuntimeException('Injected 2FA audit failure'));

        $this->actingAs($admin)->post(route('super-admin.security.two-factor.enable'), [
            'current_password' => 'password',
        ])->assertServerError();

        $this->assertNull($admin->fresh()?->two_factor_secret);
        $this->assertDatabaseMissing('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'admin.2fa_setup_started',
        ]);
    }

    public function test_responses_include_security_headers_and_a_correlation_id(): void
    {
        $requestId = 'pilot-request-1234';
        $this->withHeader('X-Request-ID', $requestId)->get(route('home'))
            ->assertHeader('X-Request-ID', $requestId)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        $this->get('/route-that-does-not-exist')
            ->assertNotFound()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Request-ID');

        $this->withHeader('X-Request-ID', 'pilot-liveness-1234')->get('/up')
            ->assertOk()
            ->assertHeader('X-Request-ID', 'pilot-liveness-1234')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->withoutHeader('X-Request-ID');
        $firstErrorId = $this->get('/missing-first')->headers->get('X-Request-ID');
        $secondErrorId = $this->get('/missing-second')->headers->get('X-Request-ID');
        $this->assertNotSame('unavailable', $firstErrorId);
        $this->assertNotSame($firstErrorId, $secondErrorId);
    }

    public function test_readiness_is_generic_and_fails_closed_when_database_is_unavailable(): void
    {
        $this->getJson(route('ready'))->assertOk()->assertExactJson(['status' => 'ready']);

        DB::shouldReceive('select')->once()->andThrow(new RuntimeException('credential and topology detail'));
        $response = $this->getJson(route('ready'));
        $response->assertStatus(503)->assertExactJson(['status' => 'unavailable']);
        $this->assertStringNotContainsString('credential', $response->getContent());
    }

    public function test_readiness_returns_generic_503_when_cache_and_cleanup_are_unavailable(): void
    {
        Cache::shouldReceive('put')->once()->andThrow(new RuntimeException('cache topology detail'));
        Cache::shouldReceive('forget')->once()->andThrow(new RuntimeException('cache cleanup detail'));

        $this->getJson(route('ready'))
            ->assertStatus(503)
            ->assertExactJson(['status' => 'unavailable']);
    }

    public function test_named_store_write_limiter_does_not_limit_reads_and_throttles_writes(): void
    {
        config(['security.store_writes_per_minute' => 2]);
        RateLimiter::clear('unused');
        Route::get('/_test/read-limit', fn () => 'ok')->middleware(['web', 'auth', 'throttle:store-writes']);
        Route::post('/_test/write-limit', fn () => 'ok')->middleware(['web', 'auth', 'throttle:store-writes']);
        $user = User::factory()->create();

        $this->actingAs($user)->get('/_test/read-limit')->assertOk();
        $this->actingAs($user)->get('/_test/read-limit')->assertOk();
        $this->actingAs($user)->get('/_test/read-limit')->assertOk();
        $this->actingAs($user)->post('/_test/write-limit')->assertOk();
        $this->actingAs($user)->post('/_test/write-limit')->assertOk();
        $this->actingAs($user)->post('/_test/write-limit')->assertTooManyRequests();
    }

    public function test_production_preflight_fails_closed_for_the_test_environment(): void
    {
        $originalUrl = config('app.url');
        config(['app.url' => 'http://localhost']);

        try {
            $this->artisan('app:production-check')->assertFailed();

            $checks = app(ProductionReadiness::class)->evaluate(false);
            $this->assertContains('environment', collect($checks)->where('critical', true)->where('passed', false)->pluck('key'));
            $this->assertContains('https_url', collect($checks)->where('critical', true)->where('passed', false)->pluck('key'));
        } finally {
            config(['app.url' => $originalUrl]);
        }
    }

    public function test_production_preflight_accepts_known_safe_static_configuration(): void
    {
        $originalEnvironment = $this->app->environment();
        $safeConfiguration = [
            'app.debug' => false,
            'app.key' => 'base64:'.base64_encode(random_bytes(32)),
            'app.url' => 'https://pilot.example.com',
            'security.force_https' => true,
            'security.content_security_policy' => true,
            'security.hsts' => true,
            'security.platform_admin_2fa_required' => true,
            'session.secure' => true,
            'session.encrypt' => true,
            'session.http_only' => true,
            'session.same_site' => 'lax',
            'session.driver' => 'database',
            'database.default' => 'mysql',
            'cache.default' => 'redis',
            'queue.default' => 'redis',
            'mail.default' => 'smtp',
            'logging.production_level' => 'info',
        ];
        $originalConfiguration = collect($safeConfiguration)
            ->mapWithKeys(fn (mixed $value, string $key): array => [$key => config($key)])
            ->all();

        try {
            $this->app->detectEnvironment(fn (): string => 'production');
            config($safeConfiguration);
            $criticalFailures = collect(app(ProductionReadiness::class)->evaluate(false))
                ->where('critical', true)
                ->where('passed', false);

            $this->assertCount(0, $criticalFailures, $criticalFailures->pluck('message')->implode("\n"));
        } finally {
            config($originalConfiguration);
            $this->app->detectEnvironment(fn (): string => $originalEnvironment);
        }
    }

    public function test_production_preflight_rejects_unknown_or_non_persistent_drivers(): void
    {
        $unsafeConfiguration = [
            'session.driver' => 'array',
            'database.default' => 'pgsql',
            'cache.default' => 'missing-cache',
            'queue.default' => null,
            'mail.default' => 'log',
        ];
        $originalConfiguration = collect($unsafeConfiguration)
            ->mapWithKeys(fn (mixed $value, string $key): array => [$key => config($key)])
            ->all();

        try {
            config($unsafeConfiguration);
            $failedKeys = collect(app(ProductionReadiness::class)->evaluate(false))
                ->where('critical', true)
                ->where('passed', false)
                ->pluck('key');

            foreach (['session_backend', 'database', 'cache', 'queue', 'mail'] as $key) {
                $this->assertContains($key, $failedKeys);
            }
        } finally {
            config($originalConfiguration);
        }
    }

    /** @param list<string> $recoveryCodes
     * @return array{User, string}
     */
    private function adminWithTwoFactor(array $recoveryCodes = ['recovery-code']): array
    {
        $secret = app(TwoFactorAuthenticationProvider::class)->generateSecretKey();
        $admin = User::factory()->superAdmin()->create([
            'two_factor_secret' => Fortify::currentEncrypter()->encrypt($secret),
            'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt(json_encode($recoveryCodes, JSON_THROW_ON_ERROR)),
            'two_factor_confirmed_at' => now(),
        ]);

        return [$admin, $secret];
    }
}
