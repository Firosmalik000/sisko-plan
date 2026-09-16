<?php

namespace App\Http\Controllers\Platform;

use App\Actions\Platform\RecordAdminAudit;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\UpdateCommerceReferenceRequest;
use App\Models\Country;
use App\Models\Marketplace;
use App\Models\PaymentMethod;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CommerceReferenceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('platform/commerce/index', [
            'countries' => Country::query()->whereIn('code', array_keys(config('localization.countries', [])))
                ->with(['paymentMethods:id,code,label,is_active', 'marketplaces:id,code,label,is_active'])
                ->orderBy('name')->get()->map(fn (Country $country): array => [
                    ...$country->only(['code', 'name']),
                    'payment_methods' => $country->paymentMethods->map(fn (PaymentMethod $method): array => [
                        ...$method->only(['code', 'label', 'is_active']), 'is_enabled' => (bool) $method->pivot->getAttribute('is_enabled'),
                    ]),
                    'marketplaces' => $country->marketplaces->map(fn (Marketplace $marketplace): array => [
                        ...$marketplace->only(['code', 'label', 'is_active']), 'is_enabled' => (bool) $marketplace->pivot->getAttribute('is_enabled'),
                    ]),
                ]),
        ]);
    }

    public function updateMarketplace(UpdateCommerceReferenceRequest $request, Marketplace $marketplace, RecordAdminAudit $audit): RedirectResponse
    {
        return $this->update($request, $marketplace, 'marketplaces', 'commerce.marketplace_availability_updated', $audit);
    }

    public function updatePaymentMethod(UpdateCommerceReferenceRequest $request, PaymentMethod $paymentMethod, RecordAdminAudit $audit): RedirectResponse
    {
        return $this->update($request, $paymentMethod, 'paymentMethods', 'commerce.payment_method_availability_updated', $audit);
    }

    private function update(UpdateCommerceReferenceRequest $request, Marketplace|PaymentMethod $reference, string $relation, string $action, RecordAdminAudit $audit): RedirectResponse
    {
        $country = Country::query()->where('code', $request->validated('country_code'))->firstOrFail();
        $admin = AuthenticatedPlatformAdmin::get($request);
        DB::transaction(function () use ($request, $reference, $relation, $country, $admin, $action, $audit): void {
            $country->{$relation}()->syncWithoutDetaching([$reference->id => [
                'is_enabled' => $request->boolean('is_enabled'),
                'priority' => DB::table($relation === 'marketplaces' ? 'country_marketplace' : 'country_payment_method')
                    ->where('country_id', $country->id)->max('priority') + 1,
            ]]);
            if ($request->has('is_active')) {
                $reference->update(['is_active' => $request->boolean('is_active')]);
            }
            $audit->handle($admin, $action, $reference, $request->ip(), [
                'country_code' => $country->code,
                'is_enabled' => $request->boolean('is_enabled'),
                'is_active' => $reference->is_active,
            ]);
        });

        return back();
    }
}
