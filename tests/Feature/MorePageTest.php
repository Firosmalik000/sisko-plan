<?php

namespace Tests\Feature;

use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MorePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_marketplace_settlement_visibility_follows_store_usage(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->ownedBy($owner)->create();

        $this->actingAs($owner)->get(route('customer.more'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/more/index')
                ->where('marketplaceEnabled', false));

        FinancialAccount::factory()->for($store)->create([
            'type' => FinancialAccountType::MarketplaceClearing,
            'is_active' => true,
        ]);

        $this->get(route('customer.more'))
            ->assertInertia(fn (Assert $page) => $page->where('marketplaceEnabled', true));
    }
}
