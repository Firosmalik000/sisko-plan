<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Models\UserSocialIdentity;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class UserSocialIdentityMigrationTest extends TestCase
{
    use RefreshDatabase;

    private string $backfillMigration = __DIR__.'/../../../database/migrations/2026_09_11_114207_backfill_google_id_into_user_social_identities.php';

    public function test_table_exists_with_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('user_social_identities'));
        $this->assertTrue(Schema::hasColumns('user_social_identities', [
            'id', 'public_id', 'user_id', 'provider', 'provider_subject', 'email', 'created_at', 'updated_at',
        ]));
    }

    public function test_provider_and_subject_pair_must_be_unique(): void
    {
        $user = User::factory()->create();

        UserSocialIdentity::factory()->create([
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_subject' => 'subject-123',
        ]);

        $this->expectException(QueryException::class);

        UserSocialIdentity::factory()->create([
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_subject' => 'subject-123',
        ]);
    }

    public function test_public_id_is_generated_as_ulid(): void
    {
        $identity = UserSocialIdentity::factory()->create();

        $this->assertNotEmpty($identity->public_id);
        $this->assertSame(26, strlen($identity->public_id));
        $this->assertSame($identity->public_id, $identity->getRouteKey());
    }

    public function test_backfill_creates_google_identity_from_users(): void
    {
        $user = User::factory()->create(['email' => 'owner@example.test']);
        $this->setLegacyGoogleId($user->id, 'google-subject-999');

        $this->runBackfill();

        $this->assertDatabaseHas('user_social_identities', [
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_subject' => 'google-subject-999',
            'email' => 'owner@example.test',
        ]);
        $this->assertSame(1, UserSocialIdentity::query()->count());
    }

    public function test_backfill_skips_users_without_google_id(): void
    {
        User::factory()->create();

        $this->runBackfill();

        $this->assertSame(0, UserSocialIdentity::query()->count());
    }

    public function test_backfill_is_idempotent_when_run_twice(): void
    {
        $user = User::factory()->create();
        $this->setLegacyGoogleId($user->id, 'google-subject-idem');

        $this->runBackfill();
        $first = UserSocialIdentity::query()->firstOrFail();

        $this->runBackfill();

        $this->assertSame(1, UserSocialIdentity::query()->count());
        $again = UserSocialIdentity::query()->firstOrFail();
        $this->assertSame($first->public_id, $again->public_id);
        $this->assertSame($user->id, $again->user_id);
    }

    /**
     * Bangun ulang kolom legacy `users.google_id` sementara untuk menguji
     * logika backfill sesuai urutan produksi (kolom ada -> backfill -> drop).
     */
    private function setLegacyGoogleId(int $userId, string $googleId): void
    {
        if (! Schema::hasColumn('users', 'google_id')) {
            Schema::table('users', function ($table): void {
                $table->string('google_id')->nullable();
            });
        }

        DB::table('users')->where('id', $userId)->update(['google_id' => $googleId]);
    }

    private function runBackfill(): void
    {
        if (! Schema::hasColumn('users', 'google_id')) {
            Schema::table('users', function ($table): void {
                $table->string('google_id')->nullable();
            });
        }

        $migration = require $this->backfillMigration;
        $migration->up();
    }
}
