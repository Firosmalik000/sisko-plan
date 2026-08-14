<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Http\Requests\MasterData\SupplierRequest;
use App\Models\Supplier;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        Gate::authorize('viewMasterData', $currentStore->get());
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $canManage = Gate::allows('manageMasterData', $currentStore->get());
        $suppliers = Supplier::query()->where('store_id', $currentStore->id())
            ->when($search !== '', fn ($query) => $query->where(fn ($nested) => $nested->where('name', 'like', "%{$search}%")->orWhere('contact_person', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%")))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')->paginate(12)->withQueryString()
            ->through(fn (Supplier $supplier) => $supplier->only(['public_id', 'name', 'contact_person', 'phone', 'email', 'address', 'is_active']));

        return Inertia::render('master-data/suppliers/index', compact('suppliers', 'search', 'status', 'canManage'));
    }

    public function store(SupplierRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        Supplier::create(['store_id' => $currentStore->id(), ...$request->validated()]);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Supplier berhasil ditambahkan.']);

        return back();
    }

    public function update(SupplierRequest $request, CurrentStore $currentStore, string $supplier): RedirectResponse
    {
        Supplier::query()->where('store_id', $currentStore->id())->where('public_id', $supplier)->firstOrFail()->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Supplier berhasil diperbarui.']);

        return back();
    }
}
