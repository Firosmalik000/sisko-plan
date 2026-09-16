<?php

namespace Tests\Feature;

use App\Enums\BusinessRole;
use App\Enums\PlatformAdminRole;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\CashTransaction;
use App\Models\Expense;
use App\Models\FinancialAccount;
use App\Models\MarketplaceSettlement;
use App\Models\Plan;
use App\Models\Purchase;
use App\Models\Register;
use App\Models\RegisterSession;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class InitialBusinessSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_initial_business_seed_is_complete_and_idempotent(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);
        $counts = $this->counts();
        $owner = User::query()->where('email', 'test@example.com')->firstOrFail();
        $passwordHash = $owner->password;
        $cashier = BusinessMembership::query()->where('public_id', '01J00000000000000000000CID')->firstOrFail();
        $pinHash = $cashier->pos_pin_hash;

        $this->seed(DatabaseSeeder::class);

        $this->assertSame($counts, $this->counts());
        $this->assertSame($passwordHash, $owner->fresh()->password);
        $this->assertSame($pinHash, $cashier->fresh()->pos_pin_hash);
        $this->assertTrue(Hash::check('593074', $cashier->fresh()->pos_pin_hash));
        $this->assertDatabaseHas('users', ['email' => 'admin@example.com', 'platform_role' => PlatformAdminRole::SuperAdmin->value]);
        $this->assertDatabaseHas('business_memberships', ['user_id' => null, 'business_role' => BusinessRole::Staff->value]);
        $this->assertSame(['ID', 'MY'], Store::query()->with('country')->orderBy('id')->get()->pluck('country.code')->all());
        $this->assertSame(['IDR', 'MYR'], Store::query()->with('settings')->orderBy('id')->get()->pluck('settings.currency')->all());
        $this->assertSame(2, MarketplaceSettlement::query()->count());
        $this->assertSame(2, Sale::query()->where('sales_channel', 'marketplace')->whereDoesntHave('settlementAllocations')->count());
        $this->assertDatabaseCount('purchases', 2);
        $this->assertDatabaseCount('sale_returns', 2);
        $this->assertDatabaseCount('expenses', 4);

        $free = Plan::query()->where('code', 'starter-default')->firstOrFail();
        $this->assertSame(2, $free->max_stores);
        $this->assertSame(1000, $free->max_products);
        $this->assertSame(3, $free->max_members);
        $this->assertSame(100, $free->max_scans);
        $this->assertSame(3, BusinessMembership::query()->whereHas('business', fn ($query) => $query->where('name', 'XBOSS Indonesia'))->where('business_role', '!=', 'owner')->where('status', 'active')->count());
        $this->assertSame(3, BusinessMembership::query()->whereHas('business', fn ($query) => $query->where('name', 'XBOSS Malaysia'))->where('business_role', '!=', 'owner')->where('status', 'active')->count());
        $this->assertFileDoesNotExist(config_path('initial-businesses.php'));
        $this->assertFileDoesNotExist(config_path('sales.php'));
    }

    public function test_existing_credentials_roles_and_store_settings_are_preserved(): void
    {
        $this->seed(DatabaseSeeder::class);
        $owner = User::query()->where('email', 'test@example.com')->firstOrFail();
        $owner->update(['password' => 'A-different-safe-password-2026!']);
        $member = $owner->businessMemberships()->firstOrFail();
        $member->update(['display_name' => 'Nama pilihan pengguna']);
        $store = $member->business->stores()->firstOrFail();
        $store->settings()->update(['timezone' => 'Asia/Makassar']);

        $this->seed(DatabaseSeeder::class);

        $this->assertTrue(Hash::check('A-different-safe-password-2026!', $owner->fresh()->password));
        $this->assertSame('Nama pilihan pengguna', $member->fresh()->display_name);
        $this->assertSame('Asia/Makassar', $store->settings()->value('timezone'));
    }

    /** @return array<string,int> */
    private function counts(): array
    {
        return [
            'users' => User::query()->count(),
            'businesses' => Business::query()->count(),
            'memberships' => BusinessMembership::query()->count(),
            'stores' => Store::query()->count(),
            'subscriptions' => Subscription::query()->count(),
            'accounts' => FinancialAccount::query()->count(),
            'registers' => Register::query()->count(),
            'register_sessions' => RegisterSession::query()->count(),
            'purchases' => Purchase::query()->count(),
            'sales' => Sale::query()->count(),
            'sale_returns' => SaleReturn::query()->count(),
            'expenses' => Expense::query()->count(),
            'settlements' => MarketplaceSettlement::query()->count(),
            'cash_transactions' => CashTransaction::query()->count(),
            'stock_movements' => StockMovement::query()->count(),
        ];
    }
}
