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
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $timezone = (string) ($store->settings()->value('timezone') ?? 'Asia/Jakarta');
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:40'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $category = (string) ($validated['category'] ?? '');
        $startDate = (string) ($validated['start_date'] ?? '');
        $endDate = (string) ($validated['end_date'] ?? '');
        $start = $startDate === '' ? null : CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$startDate} 00:00:00", $timezone)->utc();
        $end = $endDate === '' ? null : CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$endDate} 23:59:59", $timezone)->utc();
        $categories = ExpenseCategory::query()->where('store_id', $store->id)->orderBy('name')->get(['public_id', 'name', 'description', 'is_active']);
        $accounts = FinancialAccount::query()
            ->leftJoin('financial_account_balances', fn ($join) => $join->on('financial_account_balances.financial_account_id', '=', 'financial_accounts.id')->where('financial_account_balances.store_id', $store->id))
            ->where(['financial_accounts.store_id' => $store->id, 'financial_accounts.is_active' => true])
            ->orderBy('financial_accounts.name')
            ->get(['financial_accounts.public_id', 'financial_accounts.name', DB::raw('COALESCE(financial_account_balances.balance, 0) as balance')]);
        $expenseQuery = Expense::query()->where('expenses.store_id', $store->id)
            ->when($search !== '', fn ($query) => $query->where(fn ($nested) => $nested->where('document_number', 'like', "%{$search}%")->orWhere('notes', 'like', "%{$search}%")))
            ->when($category !== '', fn ($query) => $query->whereHas('category', fn ($nested) => $nested->where('public_id', $category)))
            ->when($start !== null, fn ($query) => $query->where('occurred_at', '>=', $start))
            ->when($end !== null, fn ($query) => $query->where('occurred_at', '<=', $end));
        $largestCategory = (clone $expenseQuery)->toBase()
            ->select('category_name')
            ->selectRaw('SUM(amount) as total')
            ->groupBy('category_name')
            ->orderByDesc('total')
            ->first();
        $summary = [
            'total' => Decimal::add('0', (string) (clone $expenseQuery)->sum('amount'), Decimal::MONEY_SCALE),
            'count' => (clone $expenseQuery)->count(),
            'largest_category' => $largestCategory === null ? null : [
                'name' => (string) $largestCategory->category_name,
                'total' => Decimal::add('0', (string) $largestCategory->total, Decimal::MONEY_SCALE),
            ],
            'account_balance' => Decimal::add('0', (string) $accounts->sum('balance'), Decimal::MONEY_SCALE),
        ];
        $expenses = $expenseQuery
            ->latest('id')->paginate(20, ['public_id', 'document_number', 'category_name', 'account_name', 'amount', 'occurred_at', 'notes'])->withQueryString();

        return Inertia::render('expenses/index', [
            'categories' => $categories, 'accounts' => $accounts, 'expenses' => $expenses,
            'filters' => ['search' => $search, 'category' => $category, 'start_date' => $startDate, 'end_date' => $endDate],
            'summary' => $summary,
            'timezone' => $timezone,
        ]);
    }

    public function storeCategory(ExpenseCategoryRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        ExpenseCategory::create(['store_id' => $currentStore->id(), ...$request->validated()]);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Expense category added successfully.')]);

        return back();
    }

    public function updateCategory(ExpenseCategoryRequest $request, ExpenseCategory $expenseCategory, CurrentStore $currentStore): RedirectResponse
    {
        abort_unless($expenseCategory->store_id === $currentStore->id(), 404);
        $expenseCategory->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Expense category updated successfully.')]);

        return back();
    }

    public function store(StoreExpenseRequest $request, CurrentStore $currentStore, PostExpense $action): RedirectResponse
    {
        $data = $request->validated();
        $categoryId = ExpenseCategory::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['category_id']])->valueOrFail('id');
        $accountId = FinancialAccount::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['account_id']])->valueOrFail('id');
        $action->handle($currentStore->get(), $this->actor($request), $categoryId, $accountId, $data['amount'], $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store expense posted successfully.')]);

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
