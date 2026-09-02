<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Http\Requests\MasterData\CategoryRequest;
use App\Models\Category;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        Gate::authorize('viewMasterData', $currentStore->get());
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $canManage = Gate::allows('manageMasterData', $currentStore->get());
        $categories = Category::query()
            ->where('store_id', $currentStore->id())
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')->paginate(12)->withQueryString()
            ->through(fn (Category $category) => $category->only(['public_id', 'name', 'description', 'is_active']));

        return Inertia::render('master-data/categories/index', compact('categories', 'search', 'status', 'canManage'));
    }

    public function store(CategoryRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        Category::create(['store_id' => $currentStore->id(), ...$request->validated()]);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category added successfully.')]);

        return back();
    }

    public function update(CategoryRequest $request, CurrentStore $currentStore, string $category): RedirectResponse
    {
        Category::query()->where('store_id', $currentStore->id())->where('public_id', $category)->firstOrFail()->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category updated successfully.')]);

        return back();
    }
}
