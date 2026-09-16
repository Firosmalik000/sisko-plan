<?php

namespace Database\Seeders;

use App\Actions\Expenses\PostExpense;
use App\Actions\Ledgers\PostOpeningCash;
use App\Actions\Purchasing\PostPurchase;
use App\Actions\Registers\CloseRegisterSession;
use App\Actions\Registers\OpenRegisterSession;
use App\Actions\Sales\PostMarketplaceSettlement;
use App\Actions\Sales\PostSale;
use App\Actions\Sales\PostSaleReturn;
use App\Actions\Sales\ResolveMarketplaceAccount;
use App\Actions\Stores\SeedStoreStarterData;
use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\BusinessRole;
use App\Enums\FinancialAccountType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PlatformAdminRole;
use App\Enums\StoreStatus;
use App\Enums\UserStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Country;
use App\Models\ExpenseCategory;
use App\Models\FinancialAccount;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Register;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class InitialBusinessSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $definitions = $this->definitions();
            $this->seedPlatformAdmin($definitions['platform_admin']);

            foreach ($definitions['businesses'] as $definition) {
                $this->seedBusiness($definition);
            }
        }, 3);
    }

    /** @return array{platform_admin:array{name:string,email:string,password:string},businesses:list<array<string,mixed>>} */
    private function definitions(): array
    {
        return [
            'platform_admin' => [
                'name' => 'Platform Admin',
                'email' => 'admin@example.com',
                'password' => 'Local-XBoss-Admin-2026!',
            ],
            'businesses' => [
                [
                    'public_id' => '01J000000000000000000000ID',
                    'name' => 'XBOSS Indonesia',
                    'country' => 'ID',
                    'store' => [
                        'public_id' => '01J00000000000000000000SID',
                        'name' => 'Toko XBOSS Indonesia',
                        'locale' => 'id',
                    ],
                    'members' => [
                        ['public_id' => '01J00000000000000000000OID', 'name' => 'Owner Indonesia', 'email' => 'test@example.com', 'role' => 'owner', 'password' => 'Local-XBoss-Owner-2026!'],
                        ['public_id' => '01J00000000000000000000AID', 'name' => 'Genta', 'email' => 'genta@xsisten.com', 'role' => 'admin', 'password' => 'Local-XBoss-Admin-2026!'],
                        ['public_id' => '01J00000000000000000000MID', 'name' => 'Manager Indonesia', 'email' => 'manager.id@example.test', 'role' => 'manager', 'password' => 'Local-XBoss-Manager-2026!', 'pin' => '482951'],
                        ['public_id' => '01J00000000000000000000CID', 'name' => 'Cashier Indonesia', 'email' => 'cashier.id@example.test', 'role' => 'cashier', 'status' => 'suspended', 'password' => 'Local-XBoss-Cashier-2026!', 'pin' => '593074'],
                    ],
                    'pos_member' => ['public_id' => '01J00000000000000000000PID', 'name' => 'Kasir POS Indonesia', 'role' => 'cashier', 'pin' => '614829'],
                ],
                [
                    'public_id' => '01J000000000000000000000MY',
                    'name' => 'XBOSS Malaysia',
                    'country' => 'MY',
                    'store' => [
                        'public_id' => '01J00000000000000000000SMY',
                        'name' => 'Kedai XBOSS Malaysia',
                        'locale' => 'ms',
                    ],
                    'members' => [
                        ['public_id' => '01J00000000000000000000OMY', 'name' => 'Owner Malaysia', 'email' => 'owner.my@example.test', 'role' => 'owner', 'password' => 'Local-XBoss-Owner-MY-2026!'],
                        ['public_id' => '01J00000000000000000000MMY', 'name' => 'Manager Malaysia', 'email' => 'manager.my@example.test', 'role' => 'manager', 'password' => 'Local-XBoss-Manager-MY-2026!', 'pin' => '735208'],
                        ['public_id' => '01J00000000000000000000CMY', 'name' => 'Cashier Malaysia', 'email' => 'cashier.my@example.test', 'role' => 'cashier', 'password' => 'Local-XBoss-Cashier-MY-2026!', 'pin' => '846319'],
                    ],
                    'pos_member' => ['public_id' => '01J00000000000000000000PMY', 'name' => 'Juruwang POS Malaysia', 'role' => 'cashier', 'pin' => '927430'],
                ],
            ],
        ];
    }

    /** @param array{name:string,email:string,password:?string} $definition */
    private function seedPlatformAdmin(array $definition): void
    {
        $email = Str::lower($definition['email']);
        $admin = User::query()->where('email', $email)->first();
        if ($admin === null) {
            $admin = User::create([
                'name' => $definition['name'],
                'email' => $email,
                'password' => $this->newPassword($definition['password'], $email),
                'platform_role' => PlatformAdminRole::SuperAdmin,
                'status' => UserStatus::Active,
            ]);
        } elseif ($admin->platform_role === null) {
            throw new RuntimeException("Initial Platform Admin email [{$email}] is already used by a non-platform account.");
        }

        if ($admin->email_verified_at === null) {
            $admin->forceFill(['email_verified_at' => now()])->save();
        }
    }

    /** @param array<string,mixed> $definition */
    private function seedBusiness(array $definition): void
    {
        $business = $this->resolveBusiness($definition);
        $members = [];
        foreach ($definition['members'] as $memberDefinition) {
            $members[$memberDefinition['email']] = $this->seedClaimedMember($business, $memberDefinition);
        }

        $owner = null;
        foreach ($members as $member) {
            if ($member->business_role === BusinessRole::Owner) {
                $owner = $member;
                break;
            }
        }
        if (! $owner instanceof BusinessMembership) {
            throw new RuntimeException("Initial Business [{$business->name}] has no owner.");
        }

        $store = $this->seedStore($business, $owner, $definition);
        foreach ($definition['members'] as $memberDefinition) {
            $member = $members[$memberDefinition['email']];
            if (in_array($memberDefinition['role'], ['manager', 'cashier'], true)) {
                $this->assignStore($store, $member, MembershipRole::from($memberDefinition['role']));
            }
        }
        $posMember = $this->seedPosMember($business, $definition['pos_member']);
        $this->assignStore($store, $posMember, MembershipRole::Cashier);

        app(StartDefaultSubscription::class)->handle($business);
        $this->seedOperations($store, $owner, $definition['country']);
    }

    /** @param array<string,mixed> $definition */
    private function resolveBusiness(array $definition): Business
    {
        $configured = Business::query()->where('public_id', $definition['public_id'])->first();
        $memberDefinitions = $definition['members'];
        if (! is_array($memberDefinitions)) {
            throw new RuntimeException('Initial Business members must be configured as a list.');
        }
        $emails = [];
        foreach ($memberDefinitions as $memberDefinition) {
            if (! is_array($memberDefinition) || ! is_string($memberDefinition['email'] ?? null)) {
                throw new RuntimeException('Every initial Business member requires an email.');
            }
            $emails[] = Str::lower($memberDefinition['email']);
        }
        $existingBusinessIds = BusinessMembership::query()->whereHas('user', fn ($query) => $query->whereIn('email', $emails))
            ->distinct()->pluck('business_id');

        if ($existingBusinessIds->count() > 1 || ($configured !== null && $existingBusinessIds->isNotEmpty() && ! $existingBusinessIds->contains($configured->id))) {
            throw new RuntimeException("Configured identities for [{$definition['name']}] already belong to another Business.");
        }

        return $configured
            ?? ($existingBusinessIds->isNotEmpty() ? Business::query()->findOrFail((int) $existingBusinessIds->first()) : null)
            ?? Business::create(['public_id' => $definition['public_id'], 'name' => $definition['name']]);
    }

    /** @param array<string,mixed> $definition */
    private function seedClaimedMember(Business $business, array $definition): BusinessMembership
    {
        $email = Str::lower($definition['email']);
        $user = User::query()->where('email', $email)->first();
        if ($user === null) {
            $user = User::create([
                'name' => $definition['name'],
                'email' => $email,
                'password' => $this->newPassword($definition['password'], $email),
                'status' => UserStatus::Active,
            ]);
        }
        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $other = $user->businessMemberships()->where('business_id', '!=', $business->id)->first();
        if ($other !== null) {
            throw new RuntimeException("Initial identity [{$email}] already belongs to another Business.");
        }

        $membership = BusinessMembership::query()->where('business_id', $business->id)->where('user_id', $user->id)->first();
        if ($membership !== null) {
            return $membership;
        }

        $role = in_array($definition['role'], ['owner', 'admin'], true) ? BusinessRole::from($definition['role']) : BusinessRole::Staff;

        return BusinessMembership::create([
            'public_id' => $definition['public_id'],
            'business_id' => $business->id,
            'user_id' => $user->id,
            'display_name' => $definition['name'],
            'business_role' => $role,
            'status' => MembershipStatus::from($definition['status'] ?? MembershipStatus::Active->value),
            'pos_pin_hash' => isset($definition['pin']) ? Hash::make($this->newPin($definition['pin'], $email)) : null,
            'pin_changed_at' => isset($definition['pin']) ? now() : null,
            'joined_at' => now(),
        ]);
    }

    /** @param array<string,mixed> $businessDefinition */
    private function seedStore(Business $business, BusinessMembership $owner, array $businessDefinition): Store
    {
        $definition = $businessDefinition['store'];
        $store = $business->stores()->where('public_id', $definition['public_id'])->first()
            ?? $business->stores()->oldest('id')->first();
        if ($store !== null) {
            return $store;
        }

        $country = Country::query()->where('code', $businessDefinition['country'])->firstOrFail();
        $store = Store::create([
            'public_id' => $definition['public_id'],
            'business_id' => $business->id,
            'country_id' => $country->id,
            'name' => $definition['name'],
            'status' => StoreStatus::Active,
        ]);
        $store->settings()->create([
            'currency' => $country->currency_code,
            'timezone' => $country->default_timezone,
            'locale' => $definition['locale'],
        ]);
        app(SeedStoreStarterData::class)->handle($store);

        return $store;
    }

    /** @param array<string,mixed> $definition */
    private function seedPosMember(Business $business, array $definition): BusinessMembership
    {
        $member = BusinessMembership::query()->where('public_id', $definition['public_id'])->first();
        if ($member !== null) {
            if ($member->business_id !== $business->id || $member->user_id !== null) {
                throw new RuntimeException("POS-only identity [{$definition['public_id']}] conflicts with an existing membership.");
            }

            return $member;
        }

        return BusinessMembership::create([
            'public_id' => $definition['public_id'],
            'business_id' => $business->id,
            'display_name' => $definition['name'],
            'business_role' => BusinessRole::Staff,
            'status' => MembershipStatus::Active,
            'pos_pin_hash' => Hash::make($this->newPin($definition['pin'], $definition['public_id'])),
            'pin_changed_at' => now(),
            'joined_at' => now(),
        ]);
    }

    private function assignStore(Store $store, BusinessMembership $member, MembershipRole $role): void
    {
        $assignment = DB::table('store_memberships')->where([
            'store_id' => $store->id,
            'business_membership_id' => $member->id,
        ])->first();
        if ($assignment !== null) {
            return;
        }

        DB::table('store_memberships')->insert([
            'store_id' => $store->id,
            'business_membership_id' => $member->id,
            'role' => $role->value,
            'status' => $member->status->value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function seedOperations(Store $store, BusinessMembership $actor, string $countryCode): void
    {
        $cash = FinancialAccount::query()->firstOrCreate(
            ['store_id' => $store->id, 'name' => 'Cash Register'],
            ['type' => FinancialAccountType::Cash, 'is_active' => true],
        );
        $bank = FinancialAccount::query()->firstOrCreate(
            ['store_id' => $store->id, 'name' => 'Business Bank'],
            ['type' => FinancialAccountType::Bank, 'is_active' => true],
        );
        $register = Register::query()->firstOrCreate(
            ['store_id' => $store->id, 'name' => 'Main Register'],
            ['cash_financial_account_id' => $cash->id, 'status' => 'active'],
        );
        $supplier = Supplier::query()->firstOrCreate(
            ['store_id' => $store->id, 'name' => 'Primary Supplier'],
            ['is_active' => true],
        );
        $expenseCategory = ExpenseCategory::query()->firstOrCreate(
            ['store_id' => $store->id, 'name' => 'Store Supplies'],
            ['is_active' => true],
        );
        $unit = $store->units()->where('symbol', 'pcs')->firstOrFail();
        $category = $store->categories()->oldest('id')->firstOrFail();
        $product = Product::query()->firstOrCreate(
            ['store_id' => $store->id, 'creation_token' => $this->operationKey($countryCode, 'product')],
            [
                'category_id' => $category->id,
                'base_unit_id' => $unit->id,
                'variant_mode' => 'none',
                'quantity_mode' => 'fixed',
                'name' => $countryCode === 'MY' ? 'Air Mineral 600ml' : 'Air Mineral 600 ml',
                'is_active' => true,
            ],
        );
        $productUnit = ProductUnit::query()->firstOrCreate(
            ['product_id' => $product->id, 'unit_id' => $unit->id],
            [
                'store_id' => $store->id,
                'sku' => "SEED-{$countryCode}-WATER",
                'barcode' => $countryCode === 'MY' ? '9556001000017' : '8996001000018',
                'conversion_factor' => '1',
                'purchase_price' => $countryCode === 'MY' ? '1.0000' : '5000.0000',
                'selling_price' => $countryCode === 'MY' ? '2.0000' : '8000.0000',
                'is_active' => true,
            ],
        );

        $amounts = $countryCode === 'MY'
            ? ['opening' => '500.0000', 'purchase' => '20.0000', 'cash_sale' => '4.0000', 'market_sale' => '6.0000', 'fee' => '0.5000', 'expense' => '2.0000']
            : ['opening' => '1000000.0000', 'purchase' => '100000.0000', 'cash_sale' => '16000.0000', 'market_sale' => '24000.0000', 'fee' => '2000.0000', 'expense' => '10000.0000'];
        $occurredAt = '2026-09-01T02:00:00Z';

        app(PostOpeningCash::class)->handle($store, $actor, $cash->id, $amounts['opening'], $occurredAt, 'Initial opening balance', $this->operationKey($countryCode, 'opening'));
        app(PostPurchase::class)->handle(
            $store,
            $actor,
            $supplier->id,
            [['product_unit_id' => $productUnit->id, 'quantity' => '20', 'unit_price' => (string) $productUnit->purchase_price]],
            '0',
            '0',
            $cash->id,
            $amounts['purchase'],
            '2026-09-01T02:10:00Z',
            "BOOTSTRAP-{$countryCode}-001",
            'Initial inventory purchase',
            $this->operationKey($countryCode, 'purchase'),
        );

        $session = $register->sessions()->oldest('id')->first();
        if ($session === null) {
            $session = app(OpenRegisterSession::class)->handle($register, $actor, '0');
        }
        $cashSale = app(PostSale::class)->handle(
            $store,
            $actor,
            $cash->id,
            [['product_unit_id' => $productUnit->id, 'quantity' => '2', 'item_discount' => '0']],
            '0',
            $amounts['cash_sale'],
            '2026-09-01T03:00:00Z',
            'Initial in-store sale',
            $this->operationKey($countryCode, 'cash-sale'),
            paymentMethod: 'cash',
        );
        if (! SaleReturn::query()->where('sale_id', $cashSale->id)->exists()) {
            app(PostSaleReturn::class)->handle(
                $store,
                $actor,
                $cashSale->id,
                $cash->id,
                [['sale_item_id' => SaleItem::query()->where('sale_id', $cashSale->id)->valueOrFail('id'), 'quantity' => '1']],
                '2026-09-01T03:15:00Z',
                'Initial sample return',
                $this->operationKey($countryCode, 'return'),
            );
        }
        if ($session->status === 'open') {
            $session->refresh();
            app(CloseRegisterSession::class)->handle($session, $actor, '0');
        }

        app(PostExpense::class)->handle($store, $actor, $expenseCategory->id, $cash->id, $amounts['expense'], '2026-09-01T04:00:00Z', 'Initial store supplies', $this->operationKey($countryCode, 'expense'));
        $clearing = app(ResolveMarketplaceAccount::class)->handle($store, 'shopee');
        $marketplaceSale = app(PostSale::class)->handle(
            $store,
            $actor,
            $clearing->id,
            [['product_unit_id' => $productUnit->id, 'quantity' => '3', 'item_discount' => '0']],
            '0',
            $amounts['market_sale'],
            '2026-09-01T05:00:00Z',
            'Initial marketplace sale',
            $this->operationKey($countryCode, 'market-sale-settled'),
            salesChannel: 'marketplace',
            paymentMethod: 'marketplace',
            marketplaceCode: 'shopee',
            externalOrderNumber: "SEED-{$countryCode}-SHOPEE-001",
        );
        app(PostSale::class)->handle(
            $store,
            $actor,
            $clearing->id,
            [['product_unit_id' => $productUnit->id, 'quantity' => '1', 'item_discount' => '0']],
            '0',
            $countryCode === 'MY' ? '2.0000' : '8000.0000',
            '2026-09-01T05:05:00Z',
            'Initial pending marketplace sale',
            $this->operationKey($countryCode, 'market-sale-pending'),
            salesChannel: 'marketplace',
            paymentMethod: 'marketplace',
            marketplaceCode: 'shopee',
            externalOrderNumber: "SEED-{$countryCode}-SHOPEE-002",
        );
        if (! $marketplaceSale->settlementAllocations()->exists()) {
            app(PostMarketplaceSettlement::class)->handle(
                $store,
                $actor,
                'shopee',
                $bank->id,
                [$marketplaceSale->id],
                $amounts['fee'],
                '0',
                '2026-09-01T06:00:00Z',
                'Initial marketplace payout',
                $this->operationKey($countryCode, 'settlement'),
            );
        }
    }

    private function operationKey(string $countryCode, string $operation): string
    {
        $hex = hash('sha256', "initial-business:{$countryCode}:{$operation}");

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12),
        );
    }

    private function newPassword(?string $password, string $identity): string
    {
        if (! is_string($password) || strlen($password) < 12 || preg_match('/^(password|changeme|secret|123456)/i', $password)) {
            throw new RuntimeException("A strong first-run password is required for [{$identity}].");
        }

        return $password;
    }

    private function newPin(?string $pin, string $identity): string
    {
        if (! is_string($pin) || ! preg_match('/^\d{6}$/', $pin) || preg_match('/^(\d)\1{5}$/', $pin) || in_array($pin, ['123456', '654321', '000000'], true)) {
            throw new RuntimeException("A non-default six-digit first-run PIN is required for [{$identity}].");
        }

        return $pin;
    }
}
