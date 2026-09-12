<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Langganan Api/V1 (Req 24): overview (paket + langganan aktif + kuota AI),
 * pemilihan paket (owner, reuse SelectSubscriptionPlan), harga string decimal,
 * kuota shape lengkap, non-owner ditolak.
 */
class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    private function ownerOf(Store $store): User
    {
        return User::find($store->owner_user_id);
    }

    public function test_overview_returns_plans_active_subscription_and_quota(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read']);

        $response = $this->getJson("/api/v1/stores/{$store->public_id}/subscription")->assertOk();

        // Paket tersedia (dari seeder) harga string decimal scale 4.
        $this->assertNotEmpty($response->json('data.plans'));
        $this->assertIsString($response->json('data.plans.0.monthly_price'));

        // Langganan aktif (dari StartDefaultSubscription factory).
        $this->assertNotNull($response->json('data.subscription'));
        $this->assertNotNull($response->json('data.subscription.plan.name'));

        // Kuota AI shape lengkap.
        $quota = $response->json('data.ai_quota');
        $this->assertArrayHasKey('used', $quota);
        $this->assertArrayHasKey('limit', $quota);
        $this->assertArrayHasKey('remaining', $quota);
        $this->assertArrayHasKey('unlimited', $quota);
        $this->assertArrayHasKey('reset_at', $quota);
    }

    public function test_owner_can_select_base_plan(): void
    {
        $store = Store::factory()->create();
        $owner = $this->ownerOf($store);
        Sanctum::actingAs($owner, ['store.read', 'store.settings']);

        // Paket utama berbayar lain (bukan trial) untuk berpindah.
        $plan = Plan::create([
            'code' => 'pro-monthly',
            'name' => 'Pro Bulanan',
            'kind' => Plan::KIND_BASE,
            'offer_category' => Plan::CATEGORY_GENERAL,
            'monthly_price' => '49000.0000',
            'billing_cycle' => Plan::BILLING_FIXED,
            'duration_months' => 1,
            'max_stores' => 5,
            'max_products' => 1000,
            'max_members' => 10,
            'max_scans' => 500,
            'is_default' => false,
            'is_trial' => false,
            'is_active' => true,
        ]);

        $this->postJson("/api/v1/stores/{$store->public_id}/subscription", [
            'plan_public_id' => $plan->public_id,
        ])->assertStatus(201)
            ->assertJsonPath('data.subscription.plan.name', 'Pro Bulanan');
    }

    public function test_non_owner_cannot_select_plan(): void
    {
        $store = Store::factory()->create();
        $admin = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $admin->id => ['role' => MembershipRole::Admin->value, 'status' => MembershipStatus::Active->value],
        ]);
        Sanctum::actingAs($admin, ['store.read', 'store.settings']);

        $plan = Plan::query()->where('kind', Plan::KIND_BASE)->firstOrFail();

        $this->postJson("/api/v1/stores/{$store->public_id}/subscription", [
            'plan_public_id' => $plan->public_id,
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_select_unknown_plan_returns_not_found(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'store.settings']);

        $this->postJson("/api/v1/stores/{$store->public_id}/subscription", [
            'plan_public_id' => 'nonexistent',
        ])->assertStatus(404)->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
