<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Platform\RecordAdminAudit;
use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\UpdatePlatformLogoRequest;
use App\Http\Requests\SuperAdmin\UpdatePlatformSettingRequest;
use App\Models\PlatformSetting;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\PlatformPermission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class PlatformSettingController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('super-admin/brand-seo/index', [
            'settings' => PlatformSetting::current()->publicPayload(),
            'can_manage' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::BRANDING_MANAGE),
        ]);
    }

    public function update(
        UpdatePlatformSettingRequest $request,
        RecordAdminAudit $audit,
    ): RedirectResponse {
        $admin = AuthenticatedPlatformAdmin::get($request);
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $admin, $audit, $request): void {
            $settings = PlatformSetting::query()
                ->whereKey(PlatformSetting::SINGLETON_ID)
                ->lockForUpdate()
                ->firstOrFail();
            $settings->fill($validated);
            $changedFields = array_keys($settings->getDirty());
            $settings->save();

            $audit->handle(
                $admin,
                'platform_settings.updated',
                $settings,
                $request->ip(),
                ['changed_fields' => $changedFields],
            );
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Brand and SEO saved successfully.')]);

        return back();
    }

    public function updateLogo(
        UpdatePlatformLogoRequest $request,
        RecordAdminAudit $audit,
    ): RedirectResponse {
        $admin = AuthenticatedPlatformAdmin::get($request);
        $logo = $request->file('logo');
        $path = $logo->storeAs(
            'platform-branding',
            Str::ulid().'.'.$logo->extension(),
            'local',
        );

        abort_if($path === false, 500, 'Logo gagal disimpan.');

        $oldPath = null;

        try {
            DB::transaction(function () use ($path, &$oldPath, $admin, $audit, $request): void {
                $settings = PlatformSetting::query()
                    ->whereKey(PlatformSetting::SINGLETON_ID)
                    ->lockForUpdate()
                    ->firstOrFail();
                $oldPath = $settings->logo_path;
                $settings->update(['logo_path' => $path]);

                $audit->handle(
                    $admin,
                    'platform_settings.logo_updated',
                    $settings,
                    $request->ip(),
                    ['changed_fields' => ['logo_path']],
                );
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);

            throw $exception;
        }

        if ($oldPath !== null && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Logo saved successfully.')]);

        return back();
    }

    public function destroyLogo(Request $request, RecordAdminAudit $audit): RedirectResponse
    {
        $admin = AuthenticatedPlatformAdmin::get($request);
        $oldPath = null;

        DB::transaction(function () use (&$oldPath, $admin, $audit, $request): void {
            $settings = PlatformSetting::query()
                ->whereKey(PlatformSetting::SINGLETON_ID)
                ->lockForUpdate()
                ->firstOrFail();
            $oldPath = $settings->logo_path;
            $settings->update(['logo_path' => null]);

            $audit->handle(
                $admin,
                'platform_settings.logo_removed',
                $settings,
                $request->ip(),
                ['changed_fields' => ['logo_path']],
            );
        });

        if ($oldPath !== null) {
            Storage::disk('local')->delete($oldPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Logo removed successfully.')]);

        return back();
    }

    public function logo(): StreamedResponse
    {
        $path = PlatformSetting::current()->logo_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'public, max-age=86400, immutable',
        ]);
    }
}
