<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Models\User;
use App\Models\UserSocialIdentity;
use App\Support\Authentication\TokenAbilities;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Property-based tests fondasi Api_V1 (design Correctness Properties).
 *
 * Feature: xsisten. Setiap property dijalankan >=100 iterasi dengan input acak
 * berseed agar deterministik.
 */
class ApiFoundationPropertyTest extends TestCase
{
    use RefreshDatabase;

    private const ITERATIONS = 100;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
        mt_srand(20260911);
    }

    /**
     * Feature: xsisten, Property 1: Envelope sukses selalu lengkap.
     */
    public function test_property_1_success_envelope_always_complete(): void
    {
        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $payload = ['k' => Str::random(mt_rand(1, 20)), 'n' => mt_rand(0, 999999)];
            $json = $this->decode(ApiResponse::success($payload));

            $this->assertArrayHasKey('data', $json);
            $this->assertArrayHasKey('meta', $json);
            $this->assertArrayHasKey('request_id', $json['meta']);
            $this->assertNotSame('', $json['meta']['request_id']);
        }
    }

    /**
     * Feature: xsisten, Property 2: Envelope error selalu lengkap.
     */
    public function test_property_2_error_envelope_always_complete(): void
    {
        $codes = ['VALIDATION_ERROR', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'RATE_LIMITED', 'INTERNAL'];

        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $code = $codes[array_rand($codes)];
            $retryable = (bool) mt_rand(0, 1);
            $json = $this->decode(ApiResponse::error($code, Str::random(10), [], $retryable, 400));

            $this->assertSame($code, $json['error']['code']);
            $this->assertArrayHasKey('message', $json['error']);
            $this->assertArrayHasKey('fields', $json['error']);
            $this->assertSame($retryable, $json['error']['retryable']);
            $this->assertArrayHasKey('request_id', $json['meta']);
        }
    }

    /**
     * Feature: xsisten, Property 3: Representasi uang byte-compatible (string decimal scale 4).
     */
    public function test_property_3_money_is_decimal_string_scale_4(): void
    {
        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $units = mt_rand(0, 99999999);
            $cents = mt_rand(0, 9999);
            $money = sprintf('%d.%04d', $units, $cents);

            $json = $this->decode(ApiResponse::success(['total' => $money]));

            $this->assertIsString($json['data']['total']);
            $this->assertMatchesRegularExpression('/^\d+\.\d{4}$/', $json['data']['total']);
            $this->assertSame($money, $json['data']['total']);
        }
    }

    /**
     * Feature: xsisten, Property 4: Identitas sosial unik per (provider, subject).
     */
    public function test_property_4_social_identity_unique_per_provider_subject(): void
    {
        $providers = ['google', 'apple'];

        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $user = User::factory()->create();
            $provider = $providers[array_rand($providers)];
            $subject = 'subj-'.$i.'-'.mt_rand(1000, 9999);

            UserSocialIdentity::query()->create([
                'user_id' => $user->id,
                'provider' => $provider,
                'provider_subject' => $subject,
                'email' => $user->email,
            ]);

            // Duplicate (provider, subject) harus ditolak DB.
            $threw = false;
            try {
                UserSocialIdentity::query()->create([
                    'user_id' => $user->id,
                    'provider' => $provider,
                    'provider_subject' => $subject,
                    'email' => $user->email,
                ]);
            } catch (QueryException) {
                $threw = true;
            }
            $this->assertTrue($threw, "Duplicate ({$provider},{$subject}) harus ditolak");
        }
    }

    /**
     * Feature: xsisten, Property 6: Otorisasi role — abilities sesuai matrix.
     */
    public function test_property_6_abilities_follow_role_matrix(): void
    {
        $roles = [MembershipRole::Owner, MembershipRole::Admin, MembershipRole::Cashier];

        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $role = $roles[array_rand($roles)];
            $user = User::factory()->create();
            $store = Store::factory()->create();
            $store->users()->syncWithoutDetaching([
                $user->id => ['role' => $role->value, 'status' => MembershipStatus::Active->value],
            ]);

            $abilities = TokenAbilities::forUser($user->fresh());

            // Invarian matrix: cashier tidak pernah dapat product.write / store.settings / sale.reconcile.
            if ($role === MembershipRole::Cashier) {
                $this->assertNotContains('product.write', $abilities);
                $this->assertNotContains('store.settings', $abilities);
                $this->assertNotContains('sale.reconcile', $abilities);
            }
            // sale.reconcile hanya owner.
            if ($role !== MembershipRole::Owner) {
                $this->assertNotContains('sale.reconcile', $abilities);
            }
            // Semua role dapat store.read + sale.create.
            $this->assertContains('store.read', $abilities);
            $this->assertContains('sale.create', $abilities);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(JsonResponse $response): array
    {
        return json_decode($response->getContent(), true);
    }
}
