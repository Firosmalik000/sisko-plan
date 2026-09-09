<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AndroidAppEntryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_sent_to_login_from_android_entry(): void
    {
        $this->get(route('app.entry'))->assertRedirect(route('login'));
    }

    public function test_customer_is_sent_to_dashboard_from_android_entry(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('app.entry'))
            ->assertRedirect(route('dashboard'));
    }
}
