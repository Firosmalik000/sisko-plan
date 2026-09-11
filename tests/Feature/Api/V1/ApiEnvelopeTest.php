<?php

namespace Tests\Feature\Api\V1;

use App\Http\Responses\ApiResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ApiEnvelopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.debug' => false]);

        Route::middleware('api')->prefix('api/v1')->group(function (): void {
            Route::get('/_test/envelope/success', function () {
                return ApiResponse::success([
                    'total' => '50000.0000',
                    'quantity' => '2.000000',
                ]);
            });

            Route::post('/_test/envelope/validation', function () {
                throw ValidationException::withMessages([
                    'email' => ['Email wajib diisi.'],
                ]);
            });
        });
    }

    public function test_success_response_is_wrapped_in_data_and_meta_request_id(): void
    {
        $response = $this->withHeader('X-Request-ID', 'env-success-1')
            ->getJson('/api/v1/_test/envelope/success')
            ->assertOk();

        $response->assertJsonPath('data.total', '50000.0000')
            ->assertJsonPath('data.quantity', '2.000000')
            ->assertJsonPath('meta.request_id', 'env-success-1')
            ->assertHeader('X-Request-ID', 'env-success-1');
    }

    public function test_success_envelope_preserves_money_as_decimal_strings(): void
    {
        $payload = $this->getJson('/api/v1/_test/envelope/success')
            ->assertOk()
            ->json('data');

        $this->assertSame('50000.0000', $payload['total']);
        $this->assertIsString($payload['total']);
        $this->assertIsString($payload['quantity']);
    }

    public function test_unknown_api_v1_route_returns_not_found_envelope(): void
    {
        $response = $this->withHeader('X-Request-ID', 'env-404-req')
            ->getJson('/api/v1/_test/this-route-does-not-exist')
            ->assertNotFound();

        $response->assertJsonPath('error.code', 'NOT_FOUND')
            ->assertJsonPath('error.retryable', false)
            ->assertJsonPath('meta.request_id', 'env-404-req');

        $this->assertIsString($response->json('error.message'));
    }

    public function test_validation_exception_returns_422_validation_error_with_fields(): void
    {
        $response = $this->withHeader('X-Request-ID', 'env-422-req')
            ->postJson('/api/v1/_test/envelope/validation')
            ->assertStatus(422);

        $response->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonPath('error.retryable', false)
            ->assertJsonPath('error.fields.email.0', 'Email wajib diisi.')
            ->assertJsonPath('meta.request_id', 'env-422-req');
    }

    public function test_web_error_path_is_untouched_and_still_renders_inertia(): void
    {
        Route::middleware('web')->get('/_test/web/not-found', function (): never {
            abort(404);
        });

        $this->withHeader('X-Request-ID', 'web-404-req')
            ->get('/_test/web/not-found')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page
                ->component('system/errors/show')
                ->where('status', 404)
                ->where('requestId', 'web-404-req'))
            ->assertHeaderMissing('X-Inertia-Location');
    }
}
