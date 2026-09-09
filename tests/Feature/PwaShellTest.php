<?php

namespace Tests\Feature;

use Tests\TestCase;

class PwaShellTest extends TestCase
{
    public function test_web_app_manifest_starts_at_android_entry(): void
    {
        $manifest = json_decode(file_get_contents(public_path('manifest.webmanifest')), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame('XSISTEN', $manifest['name']);
        $this->assertSame('/app', $manifest['start_url']);
        $this->assertSame('standalone', $manifest['display']);
        $this->assertFileExists(public_path('icons/icon-192.png'));
        $this->assertFileExists(public_path('icons/icon-512.png'));
        $this->assertFileExists(public_path('icons/icon-maskable-512.png'));
    }

    public function test_offline_shell_is_self_contained_and_service_worker_only_falls_back_for_navigation(): void
    {
        $offline = file_get_contents(public_path('offline.html'));
        $serviceWorker = file_get_contents(public_path('service-worker.js'));

        $this->assertStringContainsString('Tidak ada koneksi', $offline);
        $this->assertStringContainsString('Coba lagi', $offline);
        $this->assertStringContainsString("const OFFLINE_URL = '/offline.html'", $serviceWorker);
        $this->assertStringContainsString("request.mode !== 'navigate'", $serviceWorker);
        $this->assertStringContainsString('caches.match(OFFLINE_URL)', $serviceWorker);
        $this->assertStringNotContainsString('cache.put', $serviceWorker);
    }

    public function test_application_document_registers_the_manifest_and_service_worker(): void
    {
        $blade = file_get_contents(resource_path('views/app.blade.php'));
        $application = file_get_contents(resource_path('js/app.tsx'));

        $this->assertStringContainsString('rel="manifest" href="/manifest.webmanifest"', $blade);
        $this->assertStringContainsString("navigator.serviceWorker.register('/service-worker.js')", $application);
        $this->assertStringContainsString('.catch(() => undefined)', $application);
    }
}
