<?php

namespace Tests\Feature\Api\V1;

use App\Enums\NotificationCategory;
use App\Models\MobileNotification;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak `GET /stores/{store}/notifications` — notification center store-scoped
 * (design §10, Req 15.2): ability `store.read`, tenant isolation, filter
 * kategori, cursor pagination.
 */
class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function ownerAndStore(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        return [$owner, $store];
    }

    public function test_index_returns_store_scoped_notifications(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        MobileNotification::factory()->for($store)->count(3)->create();

        // Notifikasi toko lain tidak boleh bocor (tenant isolation).
        $otherStore = Store::factory()->create();
        MobileNotification::factory()->for($otherStore)->count(2)->create();

        Sanctum::actingAs($owner, ['store.read']);

        $this->getJson("/api/v1/stores/{$store->public_id}/notifications")
            ->assertOk()
            ->assertJsonCount(3, 'data.notifications')
            ->assertJsonPath('data.page.has_more', false)
            ->assertJsonStructure([
                'data' => ['notifications' => [['public_id', 'category', 'title', 'body', 'read_at', 'created_at']]],
            ]);
    }

    public function test_index_requires_store_read_ability(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        Sanctum::actingAs($owner, ['sale.create']);

        $this->getJson("/api/v1/stores/{$store->public_id}/notifications")
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_index_filters_by_category(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        MobileNotification::factory()->for($store)->category(NotificationCategory::Promo)->count(2)->create();
        MobileNotification::factory()->for($store)->category(NotificationCategory::Security)->count(1)->create();

        Sanctum::actingAs($owner, ['store.read']);

        $this->getJson("/api/v1/stores/{$store->public_id}/notifications?category=promo")
            ->assertOk()
            ->assertJsonCount(2, 'data.notifications')
            ->assertJsonPath('data.notifications.0.category', 'promo');

        $this->getJson("/api/v1/stores/{$store->public_id}/notifications?category=security")
            ->assertOk()
            ->assertJsonCount(1, 'data.notifications')
            ->assertJsonPath('data.notifications.0.category', 'security');
    }

    public function test_index_rejects_unknown_category(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        Sanctum::actingAs($owner, ['store.read']);

        $this->getJson("/api/v1/stores/{$store->public_id}/notifications?category=bogus")
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_index_shows_store_level_and_own_user_notifications_only(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $otherUser = User::factory()->create();

        MobileNotification::factory()->for($store)->create(['user_id' => null]);          // store-level
        MobileNotification::factory()->for($store)->create(['user_id' => $owner->id]);     // owner
        MobileNotification::factory()->for($store)->create(['user_id' => $otherUser->id]); // other user

        Sanctum::actingAs($owner, ['store.read']);

        $this->getJson("/api/v1/stores/{$store->public_id}/notifications")
            ->assertOk()
            ->assertJsonCount(2, 'data.notifications');
    }

    public function test_index_paginates_with_cursor(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        MobileNotification::factory()->for($store)->count(7)->create();
        Sanctum::actingAs($owner, ['store.read']);

        $first = $this->getJson("/api/v1/stores/{$store->public_id}/notifications?limit=3");
        $first->assertOk()
            ->assertJsonCount(3, 'data.notifications')
            ->assertJsonPath('data.page.has_more', true);

        $cursor = $first->json('data.page.next_cursor');
        $this->assertNotNull($cursor);

        $firstIds = collect($first->json('data.notifications'))->pluck('public_id')->all();

        $second = $this->getJson("/api/v1/stores/{$store->public_id}/notifications?limit=3&cursor={$cursor}");
        $second->assertOk()->assertJsonCount(3, 'data.notifications');

        $secondIds = collect($second->json('data.notifications'))->pluck('public_id')->all();
        $this->assertEmpty(array_intersect($firstIds, $secondIds));
    }

    public function test_index_denied_for_non_member_cross_tenant(): void
    {
        [, $store] = $this->ownerAndStore();
        $outsider = User::factory()->create();
        Sanctum::actingAs($outsider, ['store.read']);

        // Middleware store.membership memperlakukan non-member sebagai 404.
        $this->getJson("/api/v1/stores/{$store->public_id}/notifications")
            ->assertStatus(404);
    }
}
