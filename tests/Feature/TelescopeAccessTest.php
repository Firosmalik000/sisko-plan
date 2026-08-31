<?php

namespace Tests\Feature;

use App\Enums\PlatformAdminRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
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
