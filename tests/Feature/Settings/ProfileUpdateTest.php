<?php

namespace Tests\Feature\Settings;

use App\Enums\MembershipRole;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_profile_page_contains_active_store_and_subscription_settings(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('profile.edit'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/profile')
                ->where('store.public_id', $store->public_id)
                ->where('store.can_manage', true)
                ->where('subscription.plan_name', $store->subscription->plan->name));
    }

    public function test_owner_can_update_store_receipt_printer_and_theme_preferences(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->patch(route('settings.store.update'), [
                'store_name' => 'Toko Senja',
                'phone' => '081234567890',
                'email' => 'halo@tokosenja.test',
                'address' => 'Jl. Melati No. 10',
                'receipt_header' => 'Terima kasih',
                'receipt_footer' => 'Simpan struk ini.',
                'receipt_paper_size' => '80mm',
                'receipt_show_address' => true,
                'receipt_show_cashier' => false,
                'printer_name' => 'RPP02N',
                'auto_print_receipt' => true,
                'receipt_copies' => 2,
                'theme_color' => '#176b87',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('stores', ['id' => $store->id, 'name' => 'Toko Senja']);
        $this->assertDatabaseHas('store_settings', [
            'store_id' => $store->id,
            'receipt_paper_size' => '80mm',
            'printer_name' => 'RPP02N',
            'auto_print_receipt' => true,
            'theme_color' => '#176b87',
        ]);
    }

    public function test_non_owner_cannot_update_store_preferences(): void
    {
        $owner = User::factory()->create();
        $cashier = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $store->users()->attach($cashier->id, ['role' => MembershipRole::Cashier->value, 'status' => 'active']);

        $this->actingAs($cashier)
            ->withSession(['active_store_id' => $store->id])
            ->patch(route('settings.store.update'), [])
            ->assertForbidden();
    }

    public function test_user_can_upload_and_privately_view_profile_photo(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('profile.photo.update'), [
                'photo' => UploadedFile::fake()->image('avatar.jpg', 400, 400),
            ])
            ->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertNotNull($user->avatar_path);
        Storage::disk('local')->assertExists($user->avatar_path);
        $this->actingAs($user)->get(route('profile.photo'))->assertOk();
        auth()->logout();
        $this->get(route('profile.photo'))->assertRedirect(route('login'));
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete(route('profile.destroy'), [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('profile.edit'))
            ->delete(route('profile.destroy'), [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->fresh());
    }
}
