<?php

namespace Tests\Feature;

use App\Actions\Ledgers\PostOpeningCash;
use App\Enums\BusinessRole;
use App\Enums\FinancialAccountType;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OperationalActorBackfillTest extends TestCase
{
    use RefreshDatabase;

    public function test_operational_tables_expose_business_membership_actor_columns(): void
    {
        foreach (['stock_adjustments', 'account_transfers', 'capital_transactions', 'cash_transactions', 'stock_movements', 'purchases', 'purchase_payments', 'supplier_payable_transactions', 'sales', 'sale_payments', 'sale_returns', 'expenses'] as $table) {
            $this->assertTrue(Schema::hasColumn($table, 'created_by_business_membership_id'), $table);
            $this->assertFalse(Schema::hasColumn($table, 'created_by_user_id'), $table);
        }
        $this->assertTrue(Schema::hasColumns('stock_counts', [
            'created_by_business_membership_id', 'completed_by_business_membership_id',
            'posted_by_business_membership_id', 'cancelled_by_business_membership_id',
        ]));
        $this->assertTrue(Schema::hasColumns('sales', ['cashier_name']));
        $this->assertFalse(Schema::hasColumn('stores', 'owner_user_id'));
        $this->assertFalse(Schema::hasColumn('store_memberships', 'user_id'));
        foreach (['subscriptions', 'subscription_periods', 'subscription_addons', 'subscription_payments', 'subscription_scan_usages', 'subscription_scan_events'] as $table) {
            $this->assertFalse(Schema::hasColumn($table, 'user_id'), $table);
        }
    }

    public function test_owner_operation_uses_business_membership_without_store_owner_assignment(): void
    {
        $user = User::factory()->create();
        $business = Business::factory()->create();
        $actor = BusinessMembership::factory()->for($business)->for($user)->create(['business_role' => BusinessRole::Owner]);
        $store = Store::factory()->for($business)->ownedBy($user)->create();
        $cash = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Cash]);

        $transaction = app(PostOpeningCash::class)->handle(
            $store, $actor, $cash->id, '100', now()->toISOString(), null, 'membership-actor',
        );

        $this->assertSame($actor->id, $transaction->created_by_business_membership_id);
        $this->assertDatabaseHas('audit_logs', [
            'actor_type' => $actor->getMorphClass(), 'actor_id' => $actor->id,
        ]);
    }
}
