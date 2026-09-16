<?php

namespace App\Http\Controllers\Customer;

use App\Enums\FinancialAccountType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Registers\SaveRegisterRequest;
use App\Models\FinancialAccount;
use App\Models\Register;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RegisterController extends Controller
{
    public function index(CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        Gate::authorize('store.manage', $store);

        return Inertia::render('customer/registers/index', [
            'registers' => Register::query()->where('store_id', $store->id)->with('cashAccount:id,public_id,name')
                ->orderBy('name')->get(['id', 'public_id', 'name', 'cash_financial_account_id', 'status']),
            'cashAccounts' => FinancialAccount::query()->where(['store_id' => $store->id, 'type' => FinancialAccountType::Cash->value, 'is_active' => true])
                ->orderBy('name')->get(['public_id', 'name']),
        ]);
    }

    public function store(SaveRegisterRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        $store = $currentStore->get();
        Gate::authorize('store.manage', $store);
        $account = FinancialAccount::query()->where([
            'store_id' => $store->id,
            'public_id' => $request->validated('cash_account_id'),
            'type' => FinancialAccountType::Cash->value,
            'is_active' => true,
        ])->firstOrFail();
        Register::create([
            'store_id' => $store->id,
            'name' => $request->validated('name'),
            'cash_financial_account_id' => $account->id,
            'status' => 'active',
        ]);

        return back();
    }
}
