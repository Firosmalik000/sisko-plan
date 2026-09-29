<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_without_a_store_are_sent_to_store_onboarding()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('stores.create'));
    }

    public function test_authenticated_users_with_an_active_store_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        Store::factory()->ownedBy($user)->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('customer/dashboard/index')
                ->has('channels.in_store')
                ->has('channels.marketplace')
                ->has('salesTrend')
            );
    }
}
