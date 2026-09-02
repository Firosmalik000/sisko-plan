<?php

namespace App\Http\Controllers\MasterData;

use App\Enums\FinancialAccountType;
use App\Http\Controllers\Controller;
use App\Http\Requests\MasterData\FinancialAccountRequest;
use App\Models\FinancialAccount;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class FinancialAccountController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        Gate::authorize('viewMasterData', $currentStore->get());
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $canManage = Gate::allows('manageMasterData', $currentStore->get());
        $accounts = FinancialAccount::query()->where('store_id', $currentStore->id())
            ->when($search !== '', fn ($query) => $query->where(fn ($nested) => $nested->where('name', 'like', "%{$search}%")->orWhere('account_number', 'like', "%{$search}%")))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')->paginate(12)->withQueryString()
            ->through(fn (FinancialAccount $account): array => [
                ...$account->only(['public_id', 'name', 'account_number', 'notes', 'is_active']),
                'type' => $account->type->value,
            ]);

        return Inertia::render('master-data/financial-accounts/index', [
            'accounts' => $accounts,
            'accountTypes' => collect(FinancialAccountType::cases())->map(fn ($type) => $type->value),
            'search' => $search,
            'status' => $status,
            'canManage' => $canManage,
        ]);
    }

    public function store(FinancialAccountRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        FinancialAccount::create(['store_id' => $currentStore->id(), ...$request->validated()]);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Financial account added successfully.')]);

        return back();
    }

    public function update(FinancialAccountRequest $request, CurrentStore $currentStore, string $financialAccount): RedirectResponse
    {
        FinancialAccount::query()->where('store_id', $currentStore->id())->where('public_id', $financialAccount)->firstOrFail()->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Financial account updated successfully.')]);

        return back();
    }
}
