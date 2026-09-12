<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

/**
 * Akun & keamanan Api/V1 (Req 25.3, 26.1–26.4): unggah foto profil, ganti kata
 * sandi terautentikasi (validasi current), 2FA enable/confirm/disable, passkey
 * list/hapus. Secret 2FA tidak bocor ke log.
 */
class AccountSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    public function test_upload_profile_photo_sets_avatar(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['store.read']);

        $response = $this->postJson('/api/v1/me/photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg', 200, 200),
        ])->assertOk();

        $this->assertNotNull($response->json('data.avatar'));
        $this->assertNotNull($user->fresh()->avatar_path);
        Storage::disk('local')->assertExists($user->fresh()->avatar_path);
    }

    public function test_change_password_requires_correct_current(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password-123')]);
        Sanctum::actingAs($user, ['store.read']);

        // Salah current → 422.
        $this->postJson('/api/v1/me/password', [
            'current_password' => 'wrong',
            'password' => 'NewStrongPass!234',
            'password_confirmation' => 'NewStrongPass!234',
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');

        // Benar → 200 + password berubah.
        $this->postJson('/api/v1/me/password', [
            'current_password' => 'old-password-123',
            'password' => 'NewStrongPass!234',
            'password_confirmation' => 'NewStrongPass!234',
        ])->assertOk()->assertJsonPath('data.updated', true);

        $this->assertTrue(Hash::check('NewStrongPass!234', $user->fresh()->password));
    }

    public function test_two_factor_enable_confirm_disable_flow(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret-password-1')]);
        Sanctum::actingAs($user, ['store.read']);

        $enable = $this->postJson('/api/v1/me/two-factor')->assertStatus(201);
        $secret = $enable->json('data.secret');
        $this->assertNotEmpty($secret);
        $this->assertNotEmpty($enable->json('data.qr_svg'));
        $this->assertIsArray($enable->json('data.recovery_codes'));
        $this->assertFalse($enable->json('data.confirmed'));

        // Konfirmasi dengan kode TOTP valid.
        $code = app(Google2FA::class)->getCurrentOtp($secret);
        $this->postJson('/api/v1/me/two-factor/confirm', ['code' => $code])
            ->assertOk()->assertJsonPath('data.confirmed', true);

        // Disable butuh konfirmasi kata sandi.
        $this->deleteJson('/api/v1/me/two-factor', ['password' => 'wrong'])
            ->assertStatus(422);
        $this->deleteJson('/api/v1/me/two-factor', ['password' => 'secret-password-1'])
            ->assertOk()->assertJsonPath('data.enabled', false);

        $this->assertNull($user->fresh()->two_factor_secret);
    }

    public function test_passkeys_list_and_delete(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['store.read']);

        // Awal kosong.
        $this->getJson('/api/v1/me/passkeys')->assertOk()->assertJsonPath('data.passkeys', []);

        // Seed satu passkey via relasi paket.
        $passkey = $user->passkeys()->create([
            'name' => 'iPhone',
            'credential_id' => 'cred-abc',
            'credential' => ['aaguid' => 'unknown'],
        ]);

        $this->getJson('/api/v1/me/passkeys')
            ->assertOk()->assertJsonPath('data.passkeys.0.name', 'iPhone');

        $this->deleteJson("/api/v1/me/passkeys/{$passkey->id}")
            ->assertOk()->assertJsonPath('data.deleted', true);
        $this->assertDatabaseMissing('passkeys', ['id' => $passkey->id]);
    }

    public function test_passkey_registration_options_available(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['store.read']);

        $this->postJson('/api/v1/me/passkeys/options')
            ->assertOk()
            ->assertJsonStructure(['data' => ['registration_options']]);
    }
}
