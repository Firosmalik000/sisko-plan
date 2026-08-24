<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class ErrorPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.debug' => false]);

        Route::middleware('web')->match(['get', 'post'], '/_test/error/{status}', function (int $status): never {
            abort($status);
        });
        Route::middleware('web')->get('/_test/server-error', function (): never {
            throw new RuntimeException('Detail internal tidak boleh tampil.');
        });
    }

    public function test_guest_html_errors_use_the_branded_error_page(): void
    {
        foreach ([400, 403, 404, 418, 419, 422, 429, 501, 503] as $status) {
            $response = $this->withHeader('X-Request-ID', "error-page-{$status}")
                ->get("/_test/error/{$status}")
                ->assertStatus($status)
                ->assertHeader('X-Request-ID', "error-page-{$status}");

            $response->assertInertia(fn (Assert $page) => $page
                ->component('errors/show')
                ->where('status', $status)
                ->where('requestId', "error-page-{$status}")
                ->where('homeUrl', route('home'))
                ->where('loginUrl', route('login'))
                ->where('isAuthenticated', false)
                ->where('isPlatformAdmin', false));
        }
    }

    public function test_inertia_navigation_receives_an_inertia_error_component(): void
    {
        $version = app(HandleInertiaRequests::class)->version(
            Request::create('/_test/error/404'),
        );

        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version,
        ])
            ->get('/_test/error/404')
            ->assertNotFound()
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('component', 'errors/show')
            ->assertJsonPath('props.status', 404);

        $this->withHeader('X-Inertia', 'true')
            ->post('/_test/error/419')
            ->assertStatus(419)
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('component', 'errors/show')
            ->assertJsonPath('props.status', 419);
    }

    public function test_authenticated_error_actions_return_to_the_correct_portal(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/_test/error/403')
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page
                ->component('errors/show')
                ->where('homeUrl', route('dashboard'))
                ->where('isAuthenticated', true)
                ->where('isPlatformAdmin', false));

        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->get('/_test/error/403')
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page
                ->component('errors/show')
                ->where('homeUrl', route('super-admin.security.index'))
                ->where('isAuthenticated', true)
                ->where('isPlatformAdmin', true));
    }

    public function test_server_errors_hide_exception_details_in_production(): void
    {
        $this->get('/_test/server-error')
            ->assertInternalServerError()
            ->assertInertia(fn (Assert $page) => $page
                ->component('errors/show')
                ->where('status', 500)
                ->missing('exception')
                ->missing('message'));
    }

    public function test_json_errors_keep_the_json_contract(): void
    {
        $this->getJson('/_test/error/403')
            ->assertForbidden()
            ->assertJsonMissing(['component' => 'errors/show'])
            ->assertHeaderMissing('X-Inertia');
    }

    public function test_debug_server_errors_keep_the_developer_response(): void
    {
        config(['app.debug' => true]);

        $this->get('/_test/server-error')
            ->assertInternalServerError()
            ->assertHeaderMissing('X-Inertia');
    }
}
