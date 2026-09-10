<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Support\LocaleContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', Rule::in(LocaleContext::allowedLocales($request))],
            'context' => ['nullable', Rule::in(['market', 'customer'])],
        ]);

        $request->session()->put('locale', $validated['locale']);

        return back();
    }
}
