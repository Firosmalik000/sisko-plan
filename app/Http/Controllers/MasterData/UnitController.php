<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Http\Requests\MasterData\UnitRequest;
use App\Models\Unit;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        Gate::authorize('viewMasterData', $currentStore->get());
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $canManage = Gate::allows('manageMasterData', $currentStore->get());
        $units = Unit::query()->where('store_id', $currentStore->id())
            ->when($search !== '', fn ($query) => $query->where(fn ($nested) => $nested->where('name', 'like', "%{$search}%")->orWhere('symbol', 'like', "%{$search}%")))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->orderBy('unit_type')->orderBy('name')->paginate(20)->withQueryString()
            ->through(fn (Unit $unit) => [
                ...$unit->only(['public_id', 'name', 'symbol', 'is_active']),
                'unit_type' => $unit->unit_type->value,
                'unit_type_label' => $unit->unit_type->label(),
            ]);

        return Inertia::render('master-data/units/index', compact('units', 'search', 'status', 'canManage'));
    }

    public function store(UnitRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        Unit::create(['store_id' => $currentStore->id(), ...$request->validated()]);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Unit added successfully.')]);

        return back();
    }

    public function update(UnitRequest $request, CurrentStore $currentStore, string $unit): RedirectResponse
    {
        Unit::query()->where('store_id', $currentStore->id())->where('public_id', $unit)->firstOrFail()->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Unit updated successfully.')]);

        return back();
    }
}
