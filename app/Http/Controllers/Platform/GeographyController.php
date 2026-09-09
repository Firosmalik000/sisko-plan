<?php

namespace App\Http\Controllers\Platform;

use App\Actions\Platform\RecordAdminAudit;
use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Models\Currency;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\PlatformPermission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GeographyController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('platform/geography/index', [
            'countries' => Country::query()->with('currency')->withCount('stores')->orderBy('name_id')->get(),
            'currencies' => Currency::query()->withCount('countries')->orderBy('code')->get(),
            'can_manage' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::GEOGRAPHY_MANAGE),
        ]);
    }

    public function storeCountry(Request $request, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:2', 'alpha', 'uppercase', 'unique:countries,code'],
            'name_id' => ['required', 'string', 'max:100'],
            'name_ms' => ['required', 'string', 'max:100'],
            'name_en' => ['required', 'string', 'max:100'],
            'currency_code' => ['required', Rule::exists('currencies', 'code')->where('is_active', true)],
        ]);
        $admin = AuthenticatedPlatformAdmin::get($request);
        DB::transaction(function () use ($validated, $audit, $admin, $request): void {
            $currency = Currency::query()->lockForUpdate()->where('code', $validated['currency_code'])->first();
            if ($currency === null || ! $currency->is_active) {
                throw ValidationException::withMessages([
                    'currency_code' => __('Selected currency is unavailable.'),
                ]);
            }
            $country = Country::create([...$validated, 'is_active' => true]);
            $audit->handle($admin, 'country.created', $country, $request->ip(), ['after' => $validated]);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Country added successfully.')]);

        return back();
    }

    public function storeCurrency(Request $request, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:3', 'alpha', 'uppercase', 'unique:currencies,code'],
            'name' => ['required', 'string', 'max:80'],
            'symbol' => ['required', 'string', 'max:8'],
            'decimal_places' => ['required', 'integer', 'between:0,4'],
            'symbol_position' => ['required', Rule::in(['before', 'after'])],
        ]);
        $admin = AuthenticatedPlatformAdmin::get($request);
        DB::transaction(function () use ($validated, $audit, $admin, $request): void {
            $currency = Currency::create([...$validated, 'is_active' => true]);
            $audit->handle($admin, 'currency.created', null, $request->ip(), [
                'currency' => $currency->code,
                'after' => $validated,
            ]);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Currency added successfully.')]);

        return back();
    }

    public function updateCountry(Request $request, Country $country, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate([
            'name_id' => ['required', 'string', 'max:100'],
            'name_ms' => ['required', 'string', 'max:100'],
            'name_en' => ['required', 'string', 'max:100'],
            'currency_code' => ['required', Rule::exists('currencies', 'code')->where('is_active', true)],
            'is_active' => ['required', 'boolean'],
        ]);
        $admin = AuthenticatedPlatformAdmin::get($request);

        DB::transaction(function () use ($country, $validated, $audit, $admin, $request): void {
            $currency = Currency::query()->lockForUpdate()->where('code', $validated['currency_code'])->first();
            if ($currency === null || ! $currency->is_active) {
                throw ValidationException::withMessages([
                    'currency_code' => __('Selected currency is unavailable.'),
                ]);
            }

            $countries = Country::query()->lockForUpdate()->get();
            $lockedCountry = $countries->firstWhere('id', $country->id);
            if (! $validated['is_active'] && $lockedCountry->is_active && $countries->where('is_active', true)->count() === 1) {
                throw ValidationException::withMessages([
                    'is_active' => __('At least one country must remain active.'),
                ]);
            }

            $before = $lockedCountry->only(['name_id', 'name_ms', 'name_en', 'currency_code', 'is_active']);
            $lockedCountry->update($validated);
            $audit->handle($admin, 'country.updated', $lockedCountry, $request->ip(), [
                'before' => $before,
                'after' => $lockedCountry->only(array_keys($before)),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Country updated successfully.')]);

        return back();
    }

    public function updateCurrency(Request $request, Currency $currency, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'symbol' => ['required', 'string', 'max:8'],
            'decimal_places' => ['required', 'integer', 'between:0,4'],
            'symbol_position' => ['required', Rule::in(['before', 'after'])],
            'is_active' => ['required', 'boolean'],
        ]);
        $admin = AuthenticatedPlatformAdmin::get($request);

        DB::transaction(function () use ($currency, $validated, $audit, $admin, $request): void {
            $lockedCurrency = Currency::query()->lockForUpdate()->findOrFail($currency->code);
            $countries = Country::query()->where('currency_code', $currency->code)->lockForUpdate()->get();
            if (! $validated['is_active'] && $countries->contains('is_active', true)) {
                throw ValidationException::withMessages([
                    'is_active' => __('Currency masih digunakan oleh negara aktif.'),
                ]);
            }

            $before = $lockedCurrency->only(['name', 'symbol', 'decimal_places', 'symbol_position', 'is_active']);
            $lockedCurrency->update($validated);
            $audit->handle($admin, 'currency.updated', null, $request->ip(), [
                'currency' => $lockedCurrency->code,
                'before' => $before,
                'after' => $lockedCurrency->only(array_keys($before)),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Currency updated successfully.')]);

        return back();
    }
}
