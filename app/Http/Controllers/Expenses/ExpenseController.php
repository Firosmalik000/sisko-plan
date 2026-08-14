<?php

namespace App\Http\Controllers\Expenses;

use App\Actions\Expenses\PostExpense;
use App\Http\Controllers\Controller;
use App\Http\Requests\Expenses\ExpenseCategoryRequest;
use App\Http\Requests\Expenses\StoreExpenseRequest;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FinancialAccount;
use App\Models\User;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use LogicException;

class ExpenseController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewExpenses', $store);
        $search = $request->string('search')->trim()->toString();
        $category = $request->string('category')->toString();
        $categories = ExpenseCategory::query()->where('store_id', $store->id)->orderBy('name')->get(['public_id', 'name', 'description', 'is_active']);
        $accounts = FinancialAccount::query()->where(['store_id' => $store->id, 'is_active' => true])->orderBy('name')->get(['public_id', 'name']);
        $expenses = Expense::query()->where('store_id', $store->id)
            ->when($search !== '', fn ($query) => $query->where(fn ($nested) => $nested->where('document_number', 'like', "%{$search}%")->orWhere('notes', 'like', "%{$search}%")))
            ->when($category !== '', fn ($query) => $query->whereHas('category', fn ($nested) => $nested->where('public_id', $category)))
            ->latest('id')->paginate(20, ['public_id', 'document_number', 'category_name', 'account_name', 'amount', 'occurred_at', 'notes'])->withQueryString();

        return Inertia::render('expenses/index', [
            'categories' => $categories, 'accounts' => $accounts, 'expenses' => $expenses,
            'search' => $search, 'categoryFilter' => $category,
            'timezone' => $store->settings()->value('timezone') ?? 'Asia/Jakarta',
        ]);
    }

    public function storeCategory(ExpenseCategoryRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        ExpenseCategory::create(['store_id' => $currentStore->id(), ...$request->validated()]);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Kategori biaya berhasil ditambahkan.']);

        return back();
    }

    public function updateCategory(ExpenseCategoryRequest $request, ExpenseCategory $expenseCategory, CurrentStore $currentStore): RedirectResponse
    {
        abort_unless($expenseCategory->store_id === $currentStore->id(), 404);
        $expenseCategory->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Kategori biaya berhasil diperbarui.']);

        return back();
    }

    public function store(StoreExpenseRequest $request, CurrentStore $currentStore, PostExpense $action): RedirectResponse
    {
        $data = $request->validated();
        $categoryId = ExpenseCategory::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['category_id']])->valueOrFail('id');
        $accountId = FinancialAccount::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['account_id']])->valueOrFail('id');
        $action->handle($currentStore->get(), $this->actor($request), $categoryId, $accountId, $data['amount'], $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Biaya toko berhasil diposting.']);

        return back();
    }

    private function actor(Request $request): User
    {
        $user = $request->user();
        if (! $user instanceof User) {
            throw new LogicException('An authenticated store user is required.');
        }

        return $user;
    }
}
