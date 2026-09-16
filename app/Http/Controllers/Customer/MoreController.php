<?php

namespace App\Http\Controllers\Customer;

use App\Enums\FinancialAccountType;
use App\Http\Controllers\Controller;
use App\Models\FinancialAccount;
use App\Support\CurrentStore;
use Inertia\Inertia;
use Inertia\Response;

class MoreController extends Controller
{
    public function __invoke(CurrentStore $currentStore): Response
    {
        return Inertia::render('customer/more/index', [
            'marketplaceEnabled' => FinancialAccount::query()
                ->where('store_id', $currentStore->id())
                ->where('type', FinancialAccountType::MarketplaceClearing->value)
                ->where('is_active', true)
                ->exists(),
        ]);
    }
}
