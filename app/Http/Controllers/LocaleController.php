<?php

namespace App\Http\Controllers;

use App\Support\LocaleContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $customerPortal = $request->input('context') === 'customer'
            && LocaleContext::isCustomerAccount($request);
        $validated = $request->validate([
            'locale' => ['required', Rule::in(LocaleContext::allowedLocales($request, $customerPortal))],
            'context' => ['nullable', Rule::in(['market', 'customer'])],
        ]);

        if (! $customerPortal) {
            $request->session()->put('market', $validated['locale']);
        }
        $request->session()->put('locale', $validated['locale']);

        return back();
    }
}
