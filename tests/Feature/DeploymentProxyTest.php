<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class DeploymentProxyTest extends TestCase
{
    public function test_it_trusts_the_forwarded_https_scheme_from_the_deployment_proxy(): void
    {
        Route::get('/proxy-scheme-check', fn (Request $request) => [
            'secure' => $request->isSecure(),
            'url' => url('/target'),
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10'])
            ->withHeader('X-Forwarded-Proto', 'https')
            ->get('/proxy-scheme-check')
            ->assertSuccessful()
            ->assertJson([
                'secure' => true,
                'url' => 'https://localhost:8000/target',
            ]);
    }
}
