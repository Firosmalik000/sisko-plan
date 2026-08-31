<?php

namespace Tests\Feature;

use App\Enums\PlatformAdminRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Laravel\Telescope\EntryType;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Tests\TestCase;

class TelescopeAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_platform_admins_can_view_telescope(): void
    {
        $storeUser = User::factory()->make(['platform_role' => null]);
        $platformAdmin = User::factory()->make(['platform_role' => PlatformAdminRole::Admin]);

        $this->assertFalse(Gate::forUser($storeUser)->allows('viewTelescope'));
        $this->assertTrue(Gate::forUser($platformAdmin)->allows('viewTelescope'));
    }

    public function test_telescope_dashboard_allows_its_inline_assets_through_the_content_security_policy(): void
    {
        config(['security.content_security_policy' => true]);

        Route::middleware('web')->get('/telescope/_test-csp', fn (): string => 'Telescope shell');

        $response = $this->get('/telescope/_test-csp');

        $response->assertSuccessful();
        $this->assertStringContainsString("script-src 'self' 'unsafe-inline'", (string) $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('style-src', (string) $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('https://fonts.bunny.net', (string) $response->headers->get('Content-Security-Policy'));
    }

    public function test_production_filter_keeps_intelligence_requests_and_warning_logs(): void
    {
        $filter = Telescope::$filterUsing[array_key_last(Telescope::$filterUsing)];

        $warning = IncomingEntry::make(['level' => 'warning'])->type(EntryType::LOG);
        $info = IncomingEntry::make(['level' => 'info'])->type(EntryType::LOG);
        $intelligenceRequest = IncomingEntry::make([
            'uri' => rtrim((string) config('services.catalog_intelligence.url'), '/').'/health',
        ])->type(EntryType::CLIENT_REQUEST);

        $this->assertTrue($filter($warning));
        $this->assertFalse($filter($info));
        $this->assertTrue($filter($intelligenceRequest));
    }
}
