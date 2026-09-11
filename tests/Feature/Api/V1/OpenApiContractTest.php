<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Support\Facades\Route;
use Symfony\Component\Yaml\Yaml;
use Tests\TestCase;

/**
 * Verifikasi kontrak OpenAPI `/api/v1` (Req 25.4, 25.5).
 *
 * Memastikan dokumen kontrak ada, valid, mencantumkan path kunci, dan sinkron
 * dengan route yang benar-benar terdaftar — plus README strategi migrasi hadir.
 */
class OpenApiContractTest extends TestCase
{
    private function specPath(): string
    {
        return base_path('docs/api/openapi-v1.yaml');
    }

    public function test_openapi_document_exists_and_is_valid(): void
    {
        $this->assertFileExists($this->specPath());
        $this->assertFileExists(base_path('docs/api/README.md'));

        $spec = Yaml::parseFile($this->specPath());

        $this->assertSame('3.1.0', $spec['openapi']);
        $this->assertArrayHasKey('paths', $spec);
        $this->assertArrayHasKey('SuccessEnvelope', $spec['components']['schemas']);
        $this->assertArrayHasKey('ErrorEnvelope', $spec['components']['schemas']);
    }

    public function test_key_paths_are_documented(): void
    {
        $spec = Yaml::parseFile($this->specPath());
        $paths = array_keys($spec['paths']);

        $expected = [
            '/auth/tokens',
            '/me',
            '/me/profile',
            '/stores',
            '/stores/{store}/bootstrap',
            '/stores/{store}/settings',
            '/stores/{store}/sync/pull',
            '/stores/{store}/sync/push',
            '/stores/{store}/products',
            '/stores/{store}/sales',
            '/stores/{store}/sales/{sale}',
            '/stores/{store}/sales/{sale}/reconcile',
            '/stores/{store}/scanner/quota',
            '/stores/{store}/notifications',
            '/devices',
            '/distribution/catalog',
        ];

        foreach ($expected as $path) {
            $this->assertContains($path, $paths, "Path {$path} tidak terdokumentasi di OpenAPI.");
        }
    }

    public function test_documented_paths_match_registered_routes(): void
    {
        $spec = Yaml::parseFile($this->specPath());

        $registered = collect(Route::getRoutes()->getRoutes())
            ->map(fn ($route): string => $route->uri())
            ->filter(fn (string $uri): bool => str_starts_with($uri, 'api/v1/'))
            ->map(fn (string $uri): string => str_replace('api/v1', '', $uri))
            ->all();

        foreach (array_keys($spec['paths']) as $path) {
            $registeredPath = 'api/v1'.$path;
            $matches = collect(Route::getRoutes()->getRoutes())
                ->contains(fn ($route): bool => $route->uri() === $registeredPath);

            $this->assertTrue($matches, "Path OpenAPI {$path} tidak cocok dengan route terdaftar.");
        }
    }

    public function test_error_codes_cover_documented_envelope(): void
    {
        $spec = Yaml::parseFile($this->specPath());
        $codes = $spec['components']['schemas']['Error']['properties']['code']['enum'];

        foreach (['VALIDATION_ERROR', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'RATE_LIMITED', 'INTERNAL'] as $code) {
            $this->assertContains($code, $codes);
        }
    }
}
