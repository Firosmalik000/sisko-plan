<?php

namespace Tests\Feature;

use App\Actions\Registers\ApprovePosAction;
use App\Actions\Registers\CloseRegisterSession;
use App\Actions\Registers\OpenRegisterSession;
use App\Actions\Registers\PostDrawerMovement;
use App\Enums\BusinessRole;
use App\Enums\FinancialAccountType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\BusinessMembership;
use App\Models\FinancialAccount;
use App\Models\Register;
use App\Models\Store;
use App\Models\User;
use App\Services\Registers\ExpectedCash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use LogicException;
use Tests\TestCase;

class RegisterSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_allows_only_one_open_session_and_snapshots_currency(): void
    {
        [$store, $actor, $register] = $this->fixture();
        $session = app(OpenRegisterSession::class)->handle($register, $actor, '100000');

        $this->assertSame('open', $session->status);
        $this->assertSame('IDR', $session->currency_code);
        $this->assertSame('100000.0000', $session->opening_cash);
        $this->expectException(ValidationException::class);
        app(OpenRegisterSession::class)->handle($register, $actor, '0');
    }

    public function test_drawer_movements_post_atomically_and_expected_cash_is_decimal_safe(): void
    {
        [$store, $actor, $register] = $this->fixture();
        $session = app(OpenRegisterSession::class)->handle($register, $actor, '100000');
        app(PostDrawerMovement::class)->handle($session, $actor, 'cash_in', '25000.25', 'Modal tambahan');
        app(PostDrawerMovement::class)->handle($session, $actor, 'cash_out', '10000.10', 'Belanja kecil');

        $this->assertSame('115000.1500', app(ExpectedCash::class)->for($session));
        $this->assertDatabaseHas('financial_account_balances', [
            'store_id' => $store->id,
            'financial_account_id' => $register->cash_financial_account_id,
            'balance' => 15000.15,
        ]);
    }

    public function test_close_stores_server_expected_cash_count_and_variance_then_becomes_immutable(): void
    {
        [, $actor, $register] = $this->fixture();
        $session = app(OpenRegisterSession::class)->handle($register, $actor, '50000');
        app(PostDrawerMovement::class)->handle($session, $actor, 'cash_in', '10000', 'Top up drawer');

        $closed = app(CloseRegisterSession::class)->handle($session, $actor, '59000');
        $this->assertSame('60000.0000', $closed->expected_cash);
        $this->assertSame('-1000.0000', $closed->variance);
        $this->assertSame('closed', $closed->status);

        $this->expectException(ValidationException::class);
        app(PostDrawerMovement::class)->handle($closed, $actor, 'cash_in', '1', 'Late');
    }

    public function test_posted_drawer_movement_cannot_be_edited_or_deleted_and_is_corrected_by_reversal(): void
    {
        [, $actor, $register] = $this->fixture();
        $session = app(OpenRegisterSession::class)->handle($register, $actor, '0');
        $movement = app(PostDrawerMovement::class)->handle($session, $actor, 'cash_in', '10000', 'Wrong');

        try {
            $movement->update(['amount' => '1']);
            $this->fail('Movement mutation must be rejected.');
        } catch (LogicException) {
            $this->assertTrue(true);
        }
        $reversal = app(PostDrawerMovement::class)->reverse($movement, $actor, 'Correction');
        $this->assertSame('cash_out', $reversal->direction);
        $this->assertSame($movement->id, $reversal->reversal_of_movement_id);
        $this->assertSame('0.0000', app(ExpectedCash::class)->for($session));
    }

    public function test_register_rejects_non_cash_account_and_negative_amounts(): void
    {
        [$store, $actor] = $this->fixture();
        $bank = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Bank]);
        $register = Register::factory()->for($store)->create(['cash_financial_account_id' => $bank->id]);

        $this->expectException(ValidationException::class);
        app(OpenRegisterSession::class)->handle($register, $actor, '-1');
    }

    public function test_manager_approval_is_bound_to_action_target_cashier_and_single_use(): void
    {
        [$store, $owner, $register] = $this->fixture();
        $owner->update(['pos_pin_hash' => Hash::make('654321')]);
        $cashier = BusinessMembership::factory()->create([
            'business_id' => $store->business_id,
            'business_role' => BusinessRole::Staff,
        ]);
        $cashier->stores()->attach($store, [
            'role' => MembershipRole::Cashier,
            'status' => MembershipStatus::Active,
        ]);
        $session = app(OpenRegisterSession::class)->handle($register, $cashier, '10000');
        app(PostDrawerMovement::class)->handle($session, $owner, 'cash_in', '10000', 'Fund drawer account');
        $approval = app(ApprovePosAction::class)->handle($store, null, $cashier, $owner, '654321', 'drawer.cash_out', $session);
        app(PostDrawerMovement::class)->handle($session, $cashier, 'cash_out', '1000', 'Petty cash', $approval);

        $this->assertNotNull($approval->fresh()?->used_at);
        $this->expectException(ValidationException::class);
        app(PostDrawerMovement::class)->handle($session, $cashier, 'cash_out', '1000', 'Replay', $approval);
    }

    /** @return array{Store,BusinessMembership,Register} */
    private function fixture(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->ownedBy($owner)->create();
        $actor = BusinessMembership::query()->where(['business_id' => $store->business_id, 'user_id' => $owner->id])->sole();
        $account = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Cash]);
        $register = Register::factory()->for($store)->create(['cash_financial_account_id' => $account->id]);

        return [$store, $actor, $register];
    }
}
