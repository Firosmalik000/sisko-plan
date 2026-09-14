<?php

namespace App\Http\Controllers\Platform;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\PromotionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\PromotionRequest;
use App\Models\Promotion;
use App\Services\Promotions\PromotionDelivery;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\PlatformPermission;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PromotionController extends Controller
{
    public function index(Request $request, PromotionDelivery $delivery): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:160'],
            'placement' => ['nullable', Rule::in(['dashboard_banner', 'app_open'])],
            'status' => ['nullable', Rule::in(['draft', 'scheduled', 'live', 'paused', 'expired'])],
            'locale' => ['nullable', Rule::in(['all', 'id', 'ms', 'vi', 'en'])],
        ]);
        $now = now();
        $base = Promotion::query();
        $this->applyFilters($base, $filters, $now);
        $promotions = $base->orderBy('sort_order')->orderBy('id')->paginate(15)->withQueryString();
        $promotions->through(fn (Promotion $promotion): array => [
            ...$promotion->only(['public_id', 'name', 'destination_url', 'sort_order']),
            'placement' => $promotion->placement->value,
            'locale' => $promotion->locale->value,
            'starts_at' => $promotion->starts_at->toISOString(),
            'ends_at' => $promotion->ends_at->toISOString(),
            'status' => $promotion->status->value,
            'runtime_status' => $promotion->runtimeStatus($now),
            'frequency' => $promotion->frequency?->value,
            'image_url' => $delivery->bannerPayload($promotion)['image_url'],
        ]);

        $summary = [
            'live' => Promotion::query()->where('status', 'active')->where('starts_at', '<=', $now)->where('ends_at', '>=', $now)->count(),
            'scheduled' => Promotion::query()->where('status', 'active')->where('starts_at', '>', $now)->count(),
            'paused' => Promotion::query()->where('status', 'paused')->count(),
            'expired' => Promotion::query()->where('status', 'active')->where('ends_at', '<', $now)->count(),
        ];

        return Inertia::render('platform/promotions/index', [
            'promotions' => $promotions,
            'filters' => [
                'search' => (string) ($filters['search'] ?? ''),
                'placement' => (string) ($filters['placement'] ?? ''),
                'status' => (string) ($filters['status'] ?? ''),
                'locale' => (string) ($filters['locale'] ?? ''),
            ],
            'summary' => [
                'live' => $summary['live'],
                'scheduled' => $summary['scheduled'],
                'paused' => $summary['paused'],
                'expired' => $summary['expired'],
            ],
            'can_manage' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::PROMOTIONS_MANAGE),
        ]);
    }

    public function store(PromotionRequest $request, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validated();
        $path = $this->storeImage($request);

        try {
            DB::transaction(function () use ($validated, $path, $request, $audit): void {
                unset($validated['image']);
                $promotion = Promotion::create([...$validated, 'image_path' => $path]);
                $audit->handle(AuthenticatedPlatformAdmin::get($request), 'promotion.created', $promotion, $request->ip(), $this->auditMetadata($promotion));
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion created successfully.')]);

        return back();
    }

    public function update(PromotionRequest $request, Promotion $promotion, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validated();
        $newPath = $request->hasFile('image') ? $this->storeImage($request) : null;
        $oldPath = null;

        try {
            DB::transaction(function () use ($validated, $newPath, &$oldPath, $request, $promotion, $audit): void {
                $locked = Promotion::query()->lockForUpdate()->findOrFail($promotion->id);
                $beforeStatus = $locked->status->value;
                $oldPath = $locked->image_path;
                unset($validated['image']);
                if ($newPath !== null) {
                    $validated['image_path'] = $newPath;
                }
                $locked->update($validated);
                $metadata = $this->auditMetadata($locked);
                $audit->handle(AuthenticatedPlatformAdmin::get($request), 'promotion.updated', $locked, $request->ip(), $metadata);
                if ($beforeStatus !== $locked->status->value) {
                    $audit->handle(AuthenticatedPlatformAdmin::get($request), 'promotion.status_changed', $locked, $request->ip(), [
                        ...$metadata,
                        'before' => $beforeStatus,
                        'after' => $locked->status->value,
                    ]);
                }
            });
        } catch (Throwable $exception) {
            if ($newPath !== null) {
                Storage::disk('local')->delete($newPath);
            }
            throw $exception;
        }

        if ($newPath !== null && $oldPath !== null && $newPath !== $oldPath) {
            Storage::disk('local')->delete($oldPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion updated successfully.')]);

        return back();
    }

    public function updateStatus(Request $request, Promotion $promotion, RecordAdminAudit $audit): RedirectResponse
    {
        abort_unless($request->user()?->can(PlatformPermission::PROMOTIONS_MANAGE), 403);
        $validated = $request->validate(['status' => ['required', Rule::in([PromotionStatus::Active->value, PromotionStatus::Paused->value])]]);

        DB::transaction(function () use ($request, $promotion, $validated, $audit): void {
            $locked = Promotion::query()->lockForUpdate()->findOrFail($promotion->id);
            $before = $locked->status->value;
            $locked->update(['status' => $validated['status']]);
            $audit->handle(AuthenticatedPlatformAdmin::get($request), 'promotion.status_changed', $locked, $request->ip(), [
                ...$this->auditMetadata($locked),
                'before' => $before,
                'after' => $locked->status->value,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion status updated successfully.')]);

        return back();
    }

    public function destroy(Request $request, Promotion $promotion, RecordAdminAudit $audit): RedirectResponse
    {
        abort_unless($request->user()?->can(PlatformPermission::PROMOTIONS_MANAGE), 403);
        $path = null;
        DB::transaction(function () use ($request, $promotion, $audit, &$path): void {
            $locked = Promotion::query()->lockForUpdate()->findOrFail($promotion->id);
            $path = $locked->image_path;
            $audit->handle(AuthenticatedPlatformAdmin::get($request), 'promotion.deleted', $locked, $request->ip(), $this->auditMetadata($locked));
            $locked->delete();
        });
        if ($path !== null) {
            Storage::disk('local')->delete($path);
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Promotion deleted successfully.')]);

        return back();
    }

    /**
     * @param  Builder<Promotion>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters, CarbonImmutable $now): void
    {
        $query
            ->when(filled($filters['search'] ?? null), fn (Builder $query) => $query->where('name', 'like', '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $filters['search']).'%'))
            ->when(filled($filters['placement'] ?? null), fn (Builder $query) => $query->where('placement', $filters['placement']))
            ->when(filled($filters['locale'] ?? null), fn (Builder $query) => $query->where('locale', $filters['locale']));

        match ($filters['status'] ?? null) {
            'draft', 'paused' => $query->where('status', $filters['status']),
            'scheduled' => $query->where('status', 'active')->where('starts_at', '>', $now),
            'live' => $query->where('status', 'active')->where('starts_at', '<=', $now)->where('ends_at', '>=', $now),
            'expired' => $query->where('status', 'active')->where('ends_at', '<', $now),
            default => null,
        };
    }

    private function storeImage(PromotionRequest $request): string
    {
        $file = $request->file('image');
        $path = $file->storeAs('platform-promotions', Str::ulid().'.'.$file->extension(), 'local');
        abort_if($path === false, 500, __('Promotion image could not be stored.'));

        return $path;
    }

    /** @return array<string, mixed> */
    private function auditMetadata(Promotion $promotion): array
    {
        return [
            'placement' => $promotion->placement->value,
            'locale' => $promotion->locale->value,
            'status' => $promotion->status->value,
            'starts_at' => $promotion->starts_at->toISOString(),
            'ends_at' => $promotion->ends_at->toISOString(),
            'sort_order' => $promotion->sort_order,
        ];
    }
}
