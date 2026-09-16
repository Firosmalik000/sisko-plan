# Business Tenancy, Staff POS, and Southeast Asia Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Sisko Plan to a Business-scoped SaaS tenant model, add secure staff/PIN/register operations, and make Southeast Asia payment and marketplace handling dynamic without replacing the existing retail ledger or UI system.

**Architecture:** Keep the Laravel modular monolith and Store-scoped operational data. Add Business as the commercial tenant, Business Membership as the canonical operational actor, Store assignments for Manager/Cashier access, a narrow activated-device POS session, and database-backed country commerce references. Preserve posted-document immutability, server-authoritative calculations, and current Inertia/React layout patterns.

**Tech Stack:** PHP 8.4, Laravel 13, Inertia Laravel 3, React 19, TypeScript 5.7, MySQL, PHPUnit 12, Tailwind CSS 4, Wayfinder.

**Spec:** `docs/superpowers/specs/2026-09-13-business-tenancy-pos-operations-design.md`

## Global Constraints

- Execute every task directly on the currently active branch; do not create or switch to another branch or worktree.
- Work through this single plan from top to bottom; do not split it into phase documents.
- Mark each checkbox immediately after its command or edit is verified, never in advance.
- Do not commit or push at any point. After all tasks and quality gates pass, leave every verified change in the active branch working tree so the user can run tests and inspect the diff first.
- Do not report the implementation complete while any checkbox is unchecked, any required command is failing, or any reconciliation/responsive check is unverified.
- Use TDD for every behavior change: failing targeted test, minimal implementation, passing targeted test.
- Keep one canonical source for Business ownership, membership, role capability, commerce reference data, and navigation.
- Do not add dependencies, microservices, a custom tenant-role builder, automatic FX, or marketplace API integrations.
- Follow existing Laravel actions, policies, requests, controllers, models, routes, Inertia pages, Wayfinder calls, and shared UI primitives.
- All tenant operational queries remain Store-scoped and must also resolve through an accessible active Business.
- Money remains `DECIMAL(19,4)`; quantity remains `DECIMAL(18,6)`; posted totals remain server-authoritative.
- Full tenant User accounts enforce email verification; POS-only members have no email login.
- New interface copy must exist in English, Indonesian, Malay, Filipino, Vietnamese, Khmer, Lao, Burmese, Tetum, and Thai.
- Preserve the existing customer visual identity. Support 320, 375, 640, 768, 1024, 1280, and 1536 px, safe areas, keyboard occlusion, visible focus, reduced motion, and 44 px touch targets.
- Run `vendor/bin/pint --dirty --format agent` after PHP edits and the full project quality gates before completion.

---

### Task 1: Lock the Baseline and Add Business Tenancy Schema

**Files:**
- Create: `database/migrations/2026_09_16_000000_create_business_tenancy.php`
- Create: `app/Models/Business.php`
- Create: `app/Models/BusinessMembership.php`
- Create: `app/Enums/BusinessStatus.php`
- Create: `app/Enums/BusinessRole.php`
- Modify: `app/Enums/MembershipRole.php`
- Create: `database/factories/BusinessFactory.php`
- Create: `database/factories/BusinessMembershipFactory.php`
- Create: `tests/Feature/BusinessTenancyTest.php`

**Interfaces:**
- Produces: `Business`, `BusinessMembership`, `BusinessStatus::{Active,Suspended,Archived}`, `BusinessRole::{Owner,Admin,Staff}`, and `MembershipRole::{Manager,Cashier}`.
- Produces schema: `businesses`, `business_memberships`, nullable `stores.business_id`, nullable `store_memberships.business_membership_id`.

- [x] **Step 1: Record the untouched baseline**

Run:

```bash
git status --short
php artisan test --compact tests/Feature/StoreTenancyTest.php tests/Feature/SubscriptionManagementTest.php tests/Feature/SalesPosTest.php tests/Feature/SuperAdminTest.php
```

Expected: only the requested spec/plan documents are untracked; targeted tests pass before production edits.

- [x] **Step 2: Generate the schema and model files using Artisan**

Run:

```bash
php artisan make:model Business --factory --no-interaction
php artisan make:model BusinessMembership --factory --no-interaction
php artisan make:migration create_business_tenancy --no-interaction
php artisan make:test --phpunit BusinessTenancyTest --no-interaction
```

Rename the generated migration to `2026_09_16_000000_create_business_tenancy.php` if Artisan generated another timestamp.

- [x] **Step 3: Write failing schema and invariant tests**

Add tests equivalent to:

```php
public function test_a_user_can_join_multiple_businesses_but_only_once_per_business(): void
{
    $user = User::factory()->create();
    $first = Business::factory()->create();
    $second = Business::factory()->create();

    BusinessMembership::factory()->for($first)->for($user)->create();
    BusinessMembership::factory()->for($second)->for($user)->create();

    $this->expectException(QueryException::class);
    BusinessMembership::factory()->for($first)->for($user)->create();
}

public function test_pos_only_member_can_exist_without_a_user(): void
{
    $member = BusinessMembership::factory()->posOnly()->create();

    $this->assertNull($member->user_id);
    $this->assertSame(BusinessRole::Staff, $member->business_role);
}
```

- [x] **Step 4: Run the test and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/BusinessTenancyTest.php
```

Expected: FAIL because Business tenancy tables and classes do not exist.

- [x] **Step 5: Implement the minimal schema and model relationships**

Use this schema shape:

```php
Schema::create('businesses', function (Blueprint $table): void {
    $table->id();
    $table->char('public_id', 26)->unique();
    $table->string('name', 160);
    $table->string('status', 20)->default(BusinessStatus::Active->value)->index();
    $table->timestamps();
});

Schema::create('business_memberships', function (Blueprint $table): void {
    $table->id();
    $table->char('public_id', 26)->unique();
    $table->foreignId('business_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->nullable()->constrained()->restrictOnDelete();
    $table->string('display_name', 120);
    $table->string('business_role', 20);
    $table->string('status', 20)->default('active');
    $table->string('pos_pin_hash')->nullable();
    $table->timestamp('pin_changed_at')->nullable();
    $table->timestamp('invited_at')->nullable();
    $table->timestamp('joined_at')->nullable();
    $table->timestamps();
    $table->unique(['business_id', 'user_id']);
    $table->index(['business_id', 'business_role', 'status']);
});

Schema::table('stores', function (Blueprint $table): void {
    $table->foreignId('business_id')->nullable()->after('public_id')->constrained()->restrictOnDelete();
});

Schema::table('store_memberships', function (Blueprint $table): void {
    $table->foreignId('business_membership_id')->nullable()->after('store_id')->constrained()->cascadeOnDelete();
    $table->unique(['store_id', 'business_membership_id']);
});
```

Add ULID route keys, casts, and direct Eloquent relationships following `Store` and `User` conventions. Do not add repositories or generic tenant traits.

- [x] **Step 6: Format and verify Task 1**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/BusinessTenancyTest.php
```

Expected: PASS.

---

### Task 2: Deterministically Backfill Business Ownership and Store Assignments

**Files:**
- Create: `database/migrations/2026_09_16_010000_backfill_business_tenancy.php`
- Create: `tests/Feature/BusinessTenancyBackfillTest.php`
- Modify: `app/Models/User.php`
- Modify: `app/Models/Store.php`
- Modify: `app/Models/StoreMembership.php`

**Interfaces:**
- Consumes: Task 1 tables and enums.
- Produces: every existing Store has one Business; existing Owner/Admin/Cashier rows map to Owner/Manager/Cashier rules from the spec.

- [x] **Step 1: Write a legacy-fixture backfill test**

The fixture must create two Stores owned by one User, one existing `admin`, one `cashier`, and posted Sale/Purchase rows. Assert after running the backfill logic:

```php
$this->assertDatabaseCount('businesses', 1);
$this->assertDatabaseHas('business_memberships', [
    'user_id' => $owner->id,
    'business_role' => BusinessRole::Owner->value,
]);
$this->assertDatabaseHas('store_memberships', [
    'store_id' => $store->id,
    'business_membership_id' => $adminMemberId,
    'role' => MembershipRole::Manager->value,
]);
$this->assertSame($salesBefore, DB::table('sales')->sum('total_amount'));
$this->assertSame($stockBefore, DB::table('inventory_balances')->sum('quantity'));
```

- [x] **Step 2: Run the backfill test and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/BusinessTenancyBackfillTest.php
```

Expected: FAIL because no deterministic backfill exists.

- [x] **Step 3: Implement chunked, assertion-driven backfill**

Implement these exact rules in the migration:

```php
// One Business per distinct current owner preserves current subscription semantics.
// Owner -> Business Owner; existing Admin -> Store Manager; Cashier -> Store Cashier.
// Reuse one Business Membership for the same user across Stores in one Business.
// Abort on missing owner, cross-owner membership ambiguity, or count mismatch.
```

Use `orderBy()->eachById()` or bounded chunks. Generate deterministic Business names from the first active Store name, falling back to the owner name. The general migration must not inspect email addresses or special-case named accounts; the explicit initial-business configuration in Task 16 owns the approved `test@example.com`/`genta@xsisten.com` setup.

- [x] **Step 4: Add model relations without compatibility ownership fallbacks**

Add:

```php
// User
public function businessMemberships(): HasMany;

// Business
public function memberships(): HasMany;
public function stores(): HasMany;

// Store
public function business(): BelongsTo;
```

Keep old owner relations only until Task 14 cleanup; no new code may prefer them after Task 3.

- [x] **Step 5: Verify backfill invariants**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/BusinessTenancyBackfillTest.php tests/Feature/BusinessTenancyTest.php
```

Expected: PASS with unchanged posted totals and balances.

---

### Task 3: Add Active Business Context and Business-Scoped Store Resolution

**Files:**
- Create: `app/Support/CurrentBusiness.php`
- Create: `app/Http/Middleware/SetActiveBusiness.php`
- Modify: `app/Http/Middleware/SetActiveStore.php`
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Modify: `bootstrap/app.php`
- Modify: `routes/customer.php`
- Modify: `app/Http/Controllers/Customer/StoreController.php`
- Modify: `app/Actions/Stores/CreateStore.php`
- Modify: `resources/js/layouts/customer/customer-page-props.ts`
- Modify: `resources/js/types/auth.ts`
- Test: `tests/Feature/BusinessTenancyTest.php`
- Test: `tests/Feature/StoreTenancyTest.php`

**Interfaces:**
- Produces: `CurrentBusiness::get(): Business`, `CurrentBusiness::id(): int`, shared `businesses`, `activeBusiness`, `stores`, `activeStore`, and `capabilities` props.
- Consumes: authenticated User Business Memberships or terminal context from Task 6.

- [x] **Step 1: Write failing context and tampering tests**

Cover:

```php
public function test_switching_business_clears_an_inaccessible_active_store(): void;
public function test_user_cannot_select_store_from_another_business(): void;
public function test_single_business_single_store_is_selected_without_extra_input(): void;
public function test_suspended_business_blocks_operational_writes_but_preserves_owner_recovery_reads(): void;
```

- [x] **Step 2: Run targeted tests and confirm denial/context failures**

Run:

```bash
php artisan test --compact tests/Feature/BusinessTenancyTest.php tests/Feature/StoreTenancyTest.php
```

Expected: FAIL because active context is still owner/store pivot based.

- [x] **Step 3: Implement `CurrentBusiness` and middleware order**

Register aliases and order so Business resolves before Store:

```php
$middleware->alias([
    'active.business' => SetActiveBusiness::class,
    'active.store' => SetActiveStore::class,
]);
```

`SetActiveBusiness` selects only an active membership; `SetActiveStore` selects only Stores accessible through the active Business role or assignment. Session keys are `active_business_id` and `active_store_id`. Business switching clears Store, POS actor, Register, and stale tenant session state.

- [x] **Step 4: Move Store creation to Business ownership**

Change the action signature to:

```php
public function handle(
    Business $business,
    BusinessMembership $actor,
    string $name,
    ?string $ipAddress,
    string $countryCode,
    ?string $address,
    ?string $timezone = null,
): Store
```

Create Store with `business_id`; do not create a redundant Owner Store assignment.

- [x] **Step 5: Share compact context props**

Return only required values:

```ts
type BusinessSummary = {
    public_id: string;
    name: string;
    role: 'owner' | 'admin' | 'staff';
};

type CustomerPageProps = {
    businesses: BusinessSummary[];
    activeBusiness: BusinessSummary | null;
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
    capabilities: string[];
};
```

Do not serialize full membership models or PIN/device fields.

- [x] **Step 6: Format and verify Task 3**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/BusinessTenancyTest.php tests/Feature/StoreTenancyTest.php
npm run types:check
```

Expected: PASS.

---

### Task 4: Move Subscriptions, Limits, and Scan Usage to Business

**Files:**
- Create: `database/migrations/2026_09_16_020000_move_subscriptions_to_businesses.php`
- Modify: `app/Models/Subscription.php`
- Modify: `app/Models/SubscriptionPeriod.php`
- Modify: `app/Models/SubscriptionAddon.php`
- Modify: `app/Models/SubscriptionPayment.php`
- Modify: `app/Services/Subscriptions/SubscriptionAccess.php`
- Modify: `app/Support/SubscriptionEntitlements.php`
- Modify: `app/Actions/Subscriptions/StartDefaultSubscription.php`
- Modify: all actions in `app/Actions/Subscriptions/`
- Modify: `app/Http/Controllers/Customer/SubscriptionController.php`
- Modify: `app/Http/Controllers/Platform/SubscriptionController.php`
- Test: `tests/Feature/SubscriptionManagementTest.php`

**Interfaces:**
- Produces Business-scoped subscription ownership and `SubscriptionAccess::summary(Business $business): array`.
- Preserves free limits: 1 Store, 1,000 products, 1 active non-owner member, 100 AI scans.

- [x] **Step 1: Write failing Business entitlement tests**

Cover:

```php
public function test_each_business_owned_by_one_user_has_an_independent_subscription(): void;
public function test_staff_assigned_to_multiple_stores_consumes_one_business_seat(): void;
public function test_owner_does_not_consume_a_staff_seat(): void;
public function test_pos_only_and_claimed_member_are_the_same_seat(): void;
public function test_scan_usage_is_business_scoped_and_uses_explicit_utc_periods(): void;
```

- [x] **Step 2: Run subscription tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/SubscriptionManagementTest.php
```

Expected: new Business cases FAIL against User-scoped queries.

- [x] **Step 3: Add and backfill `business_id` across commercial tables**

Add nullable `business_id`, populate it from the existing owner's derived Business, validate uniqueness/counts, then make it required. Change uniqueness and indexes from User to Business. Preserve `created_by_user_id` on platform-created commercial records.

Tables:

```text
subscriptions
subscription_periods
subscription_addons
subscription_payments
subscription_scan_usages
subscription_scan_events
```

- [x] **Step 4: Replace User-scoped entitlement queries**

Use Business Stores and distinct active Business Memberships. Scan usage periods must use stored UTC boundaries; remove `Asia/Jakarta` from entitlement calculation.

Capacity mutation pattern:

```php
return DB::transaction(function () use ($business): mixed {
    $lockedBusiness = Business::query()->lockForUpdate()->findOrFail($business->id);
    $entitlements = $this->entitlements->for($lockedBusiness);
    // Recheck capacity, then mutate.
});
```

- [x] **Step 5: Format and verify Task 4**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/SubscriptionManagementTest.php tests/Feature/ProductScannerEndpointTest.php tests/Feature/StoreTenancyTest.php
```

Expected: PASS with unchanged PlanSeeder values.

---

### Task 5: Centralize Business and Store Role Capabilities

**Files:**
- Create: `app/Support/BusinessCapability.php`
- Create: `app/Policies/BusinessPolicy.php`
- Modify: `app/Policies/StorePolicy.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `resources/js/layouts/customer/navigation-contract.ts`
- Modify: `resources/js/layouts/customer/navigation-items.ts`
- Modify: `resources/js/pages/customer/more/index.tsx`
- Create: `tests/Feature/StaffAuthorizationTest.php`
- Modify: relevant authorization assertions in existing Feature tests.

**Interfaces:**
- Produces stable ability names such as `business.manage`, `members.manage`, `store.manage`, `sales.checkout`, `sales.view-all`, `register.approve`, and `reports.view`.
- Produces `BusinessCapability::for(BusinessMembership $member, ?Store $store): array` for shared navigation props.

- [x] **Step 1: Write the complete failing permission matrix**

Use a data provider covering Owner, Admin, Manager, and Cashier for every changed route family. Include explicit denial assertions for Cashier access to costs, purchasing, cash balances, expenses, reports, subscription, team management, and another Cashier's activity.

```php
#[DataProvider('roleCapabilities')]
public function test_role_capability_matrix(string $role, string $ability, bool $allowed): void
{
    [$user, $business, $store] = $this->actorForRole($role);
    $this->assertSame($allowed, Gate::forUser($user)->allows($ability, $store));
}
```

- [x] **Step 2: Run authorization tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/StaffAuthorizationTest.php
```

Expected: FAIL because Manager and Business context do not exist in policies.

- [x] **Step 3: Implement one capability map and thin policies**

Keep the matrix in one PHP class. Policies ask the catalog and validate entity context; React receives ability strings but never defines authorization truth. Remove direct role comparisons from controllers touched by this plan.

```php
public function allows(BusinessMembership $member, string $capability, ?Store $store = null): bool
{
    if ($member->status !== MembershipStatus::Active) {
        return false;
    }

    return in_array($capability, $this->capabilitiesFor($member, $store), true);
}
```

- [x] **Step 4: Filter navigation from server capabilities**

Add `capability` to the existing navigation contract and filter centrally. Do not duplicate role-specific arrays or page-level hide logic.

- [x] **Step 5: Verify authorization and current domain routes**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/StaffAuthorizationTest.php tests/Feature/MasterDataTest.php tests/Feature/OperationalLedgerTest.php tests/Feature/PurchasingTest.php tests/Feature/ExpensesReportsTest.php tests/Feature/SalesPosTest.php
npm run types:check
```

Expected: PASS.

---

### Task 6: Add Staff Management, Invitation, Claiming, and PIN Lifecycle

**Files:**
- Create: `app/Actions/Businesses/CreateBusinessMember.php`
- Create: `app/Actions/Businesses/UpdateBusinessMember.php`
- Create: `app/Actions/Businesses/ClaimBusinessMembership.php`
- Create: `app/Http/Requests/Businesses/StoreBusinessMemberRequest.php`
- Create: `app/Http/Requests/Businesses/UpdateBusinessMemberRequest.php`
- Create: `app/Http/Controllers/Customer/BusinessMemberController.php`
- Modify: `routes/customer.php`
- Modify: `app/Actions/Audit/RecordAudit.php`
- Create: `tests/Feature/BusinessMemberManagementTest.php`

**Interfaces:**
- Produces POS-only or claimed Business Memberships and Store assignments.
- Produces six-digit PIN hashing/reset and last-owner invariant enforcement.

- [x] **Step 1: Write failing member lifecycle tests**

Cover:

```php
public function test_owner_can_create_pos_only_cashier_without_email(): void;
public function test_optional_personal_device_access_requires_unique_email_and_invitation(): void;
public function test_claiming_membership_preserves_membership_id_and_history(): void;
public function test_last_owner_cannot_be_suspended_or_demoted(): void;
public function test_manager_cannot_invite_or_change_business_members(): void;
public function test_pin_is_hashed_and_never_serialized_or_audited(): void;
public function test_member_limit_is_rechecked_under_business_lock(): void;
```

- [x] **Step 2: Run lifecycle tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/BusinessMemberManagementTest.php
```

Expected: FAIL because membership actions/routes do not exist.

- [x] **Step 3: Implement request rules and atomic actions**

Required rules:

```php
'display_name' => ['required', 'string', 'max:120'],
'role' => ['required', Rule::in(['admin', 'manager', 'cashier'])],
'store_ids' => ['array'],
'store_ids.*' => [Rule::exists('stores', 'public_id')->where('business_id', $businessId)],
'pin' => ['required_without:user_id', 'digits:6'],
'email' => ['required_if:personal_device_access,1', 'email:rfc', 'max:254'],
```

Resolve all Store IDs inside the active Business and recheck entitlement under a Business lock. Owner/Admin actions update memberships and assignments in one transaction.

- [x] **Step 4: Record safe tenant audit events**

Record member created, invitation sent, claimed, role changed, assignments changed, suspended, reactivated, and PIN reset. Metadata contains membership public ID, role, and Store public IDs; never email tokens, password material, or PIN.

- [x] **Step 5: Verify Task 6**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/BusinessMemberManagementTest.php tests/Feature/SubscriptionManagementTest.php tests/Feature/StoreTenancyTest.php
```

Expected: PASS.

---

### Task 7: Migrate Tenant Operational Actors from User to Business Membership

**Files:**
- Create: `database/migrations/2026_09_16_030000_add_business_membership_actors.php`
- Modify: `app/Actions/Audit/RecordAudit.php`
- Modify: all posting actions under `app/Actions/{Expenses,Inventory,Ledgers,Purchasing,Sales}/`
- Modify: corresponding models in `app/Models/`
- Modify: affected customer controllers and reports.
- Create: `tests/Feature/OperationalActorBackfillTest.php`
- Modify: existing domain tests.

**Interfaces:**
- Produces canonical actor columns such as `created_by_business_membership_id` and state-transition equivalents.
- Produces immutable `cashier_name` snapshot on Sale.

- [x] **Step 1: Write failing actor/backfill tests**

Assert every operational actor belongs to the same Business as the document Store, POS-only Cashier can post a Sale, owner actions resolve without redundant Store membership, and changing a member display name does not rewrite old receipt cashier text.

- [x] **Step 2: Run actor tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/OperationalActorBackfillTest.php tests/Feature/SalesPosTest.php
```

Expected: FAIL because operational tables still require User actors.

- [x] **Step 3: Add nullable membership actor columns and deterministic backfill**

Cover actor columns found in:

```text
stock_adjustments, account_transfers, capital_transactions, cash_transactions,
stock_movements, purchases, purchase_payments, supplier_payable_transactions,
sales, sale_payments, sale_returns, expenses, stock_counts, audit_logs
```

Backfill through Store Business and User membership. Abort on missing/ambiguous mapping. Add `sales.cashier_name` and backfill from the User name used by the matched membership.

- [x] **Step 4: Change posting action signatures**

Replace tenant actor parameters consistently:

```php
public function handle(Store $store, BusinessMembership $actor, /* existing domain inputs */): Model
```

Do not create a generic actor wrapper. Platform subscription actions retain User actor parameters.

- [x] **Step 5: Verify every posting domain**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/OperationalActorBackfillTest.php tests/Feature/OperationalLedgerTest.php tests/Feature/StockCountTest.php tests/Feature/PurchasingTest.php tests/Feature/SalesPosTest.php tests/Feature/ExpensesReportsTest.php
```

Expected: PASS with unchanged monetary and inventory assertions.

---

### Task 8: Add Activated POS Devices and Narrow Terminal Authentication

**Files:**
- Create: `database/migrations/2026_09_16_040000_create_pos_devices.php`
- Create: `app/Models/PosDevice.php`
- Create: `database/factories/PosDeviceFactory.php`
- Create: `app/Support/CurrentPosDevice.php`
- Create: `app/Http/Middleware/AuthenticatePosDevice.php`
- Create: `app/Http/Middleware/EnsurePosActor.php`
- Create: `app/Actions/Sales/ActivatePosDevice.php`
- Create: `app/Actions/Sales/RevokePosDevice.php`
- Create: `app/Actions/Sales/UnlockPosDevice.php`
- Create: `app/Http/Controllers/Sales/PosDeviceController.php`
- Create: `app/Http/Requests/Sales/ActivatePosDeviceRequest.php`
- Create: `app/Http/Requests/Sales/UnlockPosDeviceRequest.php`
- Modify: `bootstrap/app.php`
- Modify: `routes/customer.php`
- Create: `routes/terminal.php`
- Modify: `routes/web.php`
- Create: `tests/Feature/PosDeviceAuthenticationTest.php`

**Interfaces:**
- Produces an opaque HttpOnly device cookie and narrow session keys `pos_device_id` and `pos_actor_membership_id`.
- Consumes six-digit membership PIN from Task 6.

- [x] **Step 1: Write failing device security tests**

Cover activation permission, token hashing, Store binding, revocation, wrong-PIN throttling, suspended member/device denial, unactivated-browser denial, terminal-mode clearing of back-office auth, idle lock, and successful unlock for assigned staff only.

- [x] **Step 2: Run device tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/PosDeviceAuthenticationTest.php
```

Expected: FAIL because device authentication does not exist.

- [x] **Step 3: Implement device schema and activation**

Schema core:

```php
$table->foreignId('business_id')->constrained()->restrictOnDelete();
$table->foreignId('store_id')->constrained()->restrictOnDelete();
$table->char('public_id', 26)->unique();
$table->string('name', 120);
$table->char('token_hash', 64)->unique();
$table->string('status', 20)->default('active');
$table->foreignId('activated_by_business_membership_id')->constrained('business_memberships')->restrictOnDelete();
$table->timestamp('last_seen_at')->nullable();
$table->timestamp('revoked_at')->nullable();
```

Generate the raw token with `Str::random(64)`, persist `hash('sha256', $token)`, and send the raw value only in a Secure, HttpOnly, SameSite=Lax encrypted cookie. Clear the full authenticated web session when entering terminal mode.

- [x] **Step 4: Implement staff-selection PIN unlock**

Resolve membership by public ID through the device Store assignments, verify `Hash::check($pin, $member->pos_pin_hash)`, use Laravel RateLimiter keyed by device/member, and store only membership ID in the narrow terminal session. Register terminal middleware aliases in `bootstrap/app.php`.

- [x] **Step 5: Verify device security**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/PosDeviceAuthenticationTest.php tests/Feature/AuthenticationTest.php tests/Feature/StoreTenancyTest.php
```

Expected: PASS.

---

### Task 9: Add Registers, Sessions, Drawer Movements, and Manager Approval

**Files:**
- Create: `database/migrations/2026_09_16_050000_create_register_operations.php`
- Create: `app/Models/Register.php`
- Create: `app/Models/RegisterSession.php`
- Create: `app/Models/RegisterDrawerMovement.php`
- Create: corresponding factories.
- Create: `app/Actions/Registers/OpenRegisterSession.php`
- Create: `app/Actions/Registers/CloseRegisterSession.php`
- Create: `app/Actions/Registers/PostDrawerMovement.php`
- Create: `app/Actions/Registers/ApprovePosAction.php`
- Create: `app/Services/Registers/ExpectedCash.php`
- Create: `app/Http/Controllers/Customer/RegisterController.php`
- Create: `app/Http/Controllers/Sales/RegisterSessionController.php`
- Create: focused Form Requests under `app/Http/Requests/Registers/`.
- Modify: `routes/customer.php`
- Modify: `routes/terminal.php`
- Create: `tests/Feature/RegisterSessionTest.php`

**Interfaces:**
- Produces `ExpectedCash::for(RegisterSession $session): string`.
- Produces one open Register Session per Register through row locking.
- Produces single-use manager approval records bound to action, target, cashier, device, and expiry.

- [x] **Step 1: Write failing cash-accountability tests**

Cover opening cash, concurrent open rejection, cash-in/out ledger effects, expected cash equation, counted cash and variance, immutable closed session, reversal movement, wrong-currency rejection, and manager approval scope/replay denial.

- [x] **Step 2: Run register tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/RegisterSessionTest.php
```

Expected: FAIL because register models/actions do not exist.

- [x] **Step 3: Implement Register and session schema**

Use Store-scoped tables from the spec. Register references one active Cash Financial Account. Session stores membership actors, currency snapshot, opening/expected/counted/variance amounts, open/close timestamps, and status. Drawer movements store direction, amount, reason, actor, approval actor, and reversal reference.

- [x] **Step 4: Implement transaction-locked actions**

Opening pattern:

```php
return DB::transaction(function () use ($register, $actor, $openingCash): RegisterSession {
    $locked = Register::query()->lockForUpdate()->findOrFail($register->id);
    if ($locked->sessions()->where('status', 'open')->exists()) {
        throw ValidationException::withMessages(['register' => __('This register already has an open shift.')]);
    }

    return $locked->sessions()->create(/* server-derived fields */);
});
```

Closing computes expected cash on the server under the same Register/session lock. Drawer movement and Cash Transaction post atomically.

- [x] **Step 5: Verify Task 9**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/RegisterSessionTest.php tests/Feature/OperationalLedgerTest.php
```

Expected: PASS.

---

### Task 10: Integrate Cashier/Register Attribution into Sales and Team Activity

**Files:**
- Create: `database/migrations/2026_09_16_060000_add_register_context_to_sales.php`
- Modify: `app/Actions/Sales/PostSale.php`
- Modify: `app/Http/Controllers/Sales/PosController.php`
- Modify: `app/Http/Controllers/Sales/SalesController.php`
- Modify: `app/Http/Controllers/Sales/NativeReceiptController.php`
- Create: `app/Http/Controllers/Customer/TeamActivityController.php`
- Modify: `app/Http/Requests/Sales/StoreSaleRequest.php`
- Modify: `routes/customer.php`
- Modify: `routes/terminal.php`
- Modify: `tests/Feature/SalesPosTest.php`
- Create: `tests/Feature/TeamActivityTest.php`

**Interfaces:**
- New in-store Sales consume `BusinessMembership $actor` and `RegisterSession $session`.
- Sales index supports cashier/register/session filters; Team Activity uses server-scoped aggregate queries.

- [x] **Step 1: Write failing Sale attribution and visibility tests**

Cover:

```php
public function test_in_store_sale_requires_open_session_after_cutover(): void;
public function test_cash_sale_uses_register_cash_account(): void;
public function test_sale_snapshots_cashier_name_and_currency(): void;
public function test_owner_can_filter_sales_by_cashier_register_and_session(): void;
public function test_cashier_only_sees_current_session_receipts(): void;
public function test_manager_team_activity_is_limited_to_assigned_stores(): void;
```

- [x] **Step 2: Run Sales and activity tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/SalesPosTest.php tests/Feature/TeamActivityTest.php
```

Expected: FAIL because Sale lacks Register context and activity endpoints.

- [x] **Step 3: Add nullable legacy columns and enforce new-post rules**

Add `register_session_id`, `cashier_name`, and `currency_code` to Sales; add currency snapshots to Sale Payments and Sale Returns. Leave legacy session IDs null. In `PostSale`, derive the actor/session/currency from authenticated context and reject active-store/session/account mismatch.

- [x] **Step 4: Add owner/manager activity queries**

Return paginated/filterable data only for accessible Stores and periods: member, role, last active, session status, Sale count/value, discounts, returns, drawer movements, and variance. Do not add employee ranking or cross-business queries.

- [x] **Step 5: Verify Task 10**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/SalesPosTest.php tests/Feature/TeamActivityTest.php tests/Feature/RegisterSessionTest.php
```

Expected: PASS.

---

### Task 11: Add Currency Snapshots and Store Country/Currency Immutability

**Files:**
- Create: `database/migrations/2026_09_16_070000_add_financial_currency_snapshots.php`
- Create: `app/Support/StoreOperationalHistory.php`
- Modify: posting actions for Purchases, payments, Expenses, Cash Transactions, Account Transfers, Capital Transactions, and returns.
- Modify: `app/Http/Controllers/Customer/StoreController.php`
- Modify: `app/Http/Requests/Stores/StoreUpdateRequest.php`
- Modify: reporting services/controllers that combine Stores.
- Create: `tests/Feature/MultiCountryFinanceTest.php`
- Modify: `tests/Feature/CountryCurrencyTest.php`

**Interfaces:**
- Produces `StoreOperationalHistory::hasPostedRecords(Store $store): bool` with direct existence checks.
- Every new financial header receives server-derived `currency_code`.

- [x] **Step 1: Write failing currency integrity tests**

Cover server-derived snapshots, client currency tampering ignored/rejected, country change allowed before posting, country/currency change blocked after any stock/financial ledger, timezone update still allowed, and Business totals grouped by currency.

- [x] **Step 2: Run tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/MultiCountryFinanceTest.php tests/Feature/CountryCurrencyTest.php
```

Expected: FAIL because historical documents read mutable Store currency.

- [x] **Step 3: Add and backfill currency columns**

Add `char('currency_code', 3)` with Currency foreign key to monetary document headers named in the spec. Backfill from `store_settings.currency`, falling back to Store country currency. Validate no null/unknown currency before making required.

- [x] **Step 4: Enforce immutable country/currency after posting**

`StoreOperationalHistory` checks the actual posting/ledger tables. `StoreController::update` rejects country/currency mutation with an actionable translated message once history exists; timezone remains editable.

- [x] **Step 5: Verify Task 11**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/MultiCountryFinanceTest.php tests/Feature/CountryCurrencyTest.php tests/Feature/PurchasingTest.php tests/Feature/ExpensesReportsTest.php tests/Feature/OperationalLedgerTest.php
```

Expected: PASS.

---

### Task 12: Move Country Payments and Marketplaces to Dynamic Reference Data

**Files:**
- Create: `database/migrations/2026_09_16_080000_create_country_commerce_references.php`
- Create: `app/Models/PaymentMethod.php`
- Create: `app/Models/Marketplace.php`
- Create: `app/Services/Commerce/CountryCommerceCatalog.php`
- Modify: `app/Support/PaymentMethodCatalog.php`
- Modify: `app/Support/MarketplaceCatalog.php`
- Modify: `app/Models/FinancialAccount.php`
- Modify: `app/Models/Sale.php`
- Modify: `app/Http/Controllers/Sales/PosController.php`
- Modify: `app/Http/Requests/Sales/StoreSaleRequest.php`
- Modify: `app/Actions/Sales/ResolveMarketplaceAccount.php`
- Modify: `database/seeders/DatabaseSeeder.php`
- Create: `database/seeders/CountryCommerceSeeder.php`
- Create: `tests/Feature/CountryCommerceCatalogTest.php`

**Interfaces:**
- Produces `CountryCommerceCatalog::paymentMethods(Country $country): Collection` and `marketplaces(Store $store): Collection`.
- Produces `marketplaces`, `country_marketplace`, `store_marketplace`, `payment_methods`, and `country_payment_method` reference relations.

- [x] **Step 1: Write failing country/store filtering tests**

Cover current ID/MY/TH/VN mappings, `Other` fallback for other SEA countries, Store enablement, disabled reference behavior, historical label preservation, tampered country provider rejection, and no cross-Store configuration leakage.

- [x] **Step 2: Run catalog tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/CountryCommerceCatalogTest.php tests/Feature/SalesPosTest.php
```

Expected: FAIL because catalogs still come from config arrays.

- [x] **Step 3: Create the minimal reference schema**

Use stable codes and composite uniqueness. Payment-method `kind` is only `national_qr` or `e_wallet`; Cash and Bank remain generic account behavior. Store marketplace preferences reference platform/country-enabled Marketplace IDs.

- [x] **Step 4: Seed exact conservative SEA mappings**

Seed the mappings stated in the spec. Use `updateOrCreate`/`upsert` by stable code, preserve external brand spelling, and never overwrite Store preferences. Remove the duplicated runtime catalog arrays from `config/sales.php` after callers move.

- [x] **Step 5: Enforce server-side selection rules**

Replace config lookup internals with database queries through `CountryCommerceCatalog`. Convert known legacy `payment_code` and `marketplace_code` values. Unknown marketplace codes preserve snapshots and link to `other`.

- [x] **Step 6: Verify Task 12**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/CountryCommerceCatalogTest.php tests/Feature/CountryCurrencyTest.php tests/Feature/SalesPosTest.php
```

Expected: PASS.

---

### Task 13: Add Manual Marketplace Clearing and Settlement

**Files:**
- Create: `database/migrations/2026_09_16_090000_create_marketplace_settlements.php`
- Modify: `app/Enums/FinancialAccountType.php`
- Create: `app/Models/MarketplaceSettlement.php`
- Create: `app/Models/MarketplaceSettlementSale.php`
- Create: corresponding factories.
- Create: `app/Actions/Sales/PostMarketplaceSettlement.php`
- Create: `app/Actions/Sales/ReverseMarketplaceSettlement.php`
- Create: `app/Services/Sales/MarketplaceSettlementCalculator.php`
- Create: `app/Http/Controllers/Sales/MarketplaceSettlementController.php`
- Create: `app/Http/Requests/Sales/StoreMarketplaceSettlementRequest.php`
- Modify: `routes/customer.php`
- Modify: `app/Actions/Sales/ResolveMarketplaceAccount.php`
- Create: `tests/Feature/MarketplaceSettlementTest.php`

**Interfaces:**
- Produces `FinancialAccountType::MarketplaceClearing`.
- Produces immutable, idempotent Settlement post/reversal and Sale allocation.

- [x] **Step 1: Write failing settlement calculation and posting tests**

Cover `gross - fee - refund adjustment = net`, negative/overflow rejection, currency mismatch, duplicate reference/idempotency, over-allocation, cross-Store Sale rejection, atomic clearing-to-bank transfer, fee expense, balance reconciliation, and reversal.

- [x] **Step 2: Run settlement tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/MarketplaceSettlementTest.php
```

Expected: FAIL because settlement workflow does not exist.

- [x] **Step 3: Implement explicit clearing account type and schema**

Convert Financial Accounts with non-null `marketplace_code` from e-wallet to marketplace clearing. Add Settlement header and Sale allocation tables with Store, Marketplace, destination account, snapshots, decimal amounts, reference, idempotency, actor, and reversal linkage.

- [x] **Step 4: Implement decimal-safe calculator and atomic action**

Calculator contract:

```php
/** @return array{gross:string,fee:string,refund_adjustment:string,net:string} */
public function calculate(string $gross, string $fee, string $refundAdjustment): array;
```

The posting action locks clearing balance, destination account, and allocations; posts net transfer and fee Expense in one transaction; then records allocation and audit. Reversal posts inverse ledger entries and links the original without editing it.

- [x] **Step 5: Verify Task 13**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/MarketplaceSettlementTest.php tests/Feature/OperationalLedgerTest.php tests/Feature/ExpensesReportsTest.php tests/Feature/SalesPosTest.php
```

Expected: PASS with clearing balance reconciled.

---

### Task 14: Build Customer UI for Business, Team, Devices, Registers, and Settlement

**Files:**
- Modify: `resources/js/layouts/customer/customer-page-props.ts`
- Modify: `resources/js/layouts/customer/customer-header.tsx`
- Modify: `resources/js/layouts/customer/customer-navigation.tsx`
- Modify: `resources/js/layouts/customer/navigation-contract.ts`
- Modify: `resources/js/layouts/customer/navigation-items.ts`
- Create: `resources/js/pages/customer/team/index.tsx`
- Create: `resources/js/pages/customer/team/show.tsx`
- Create: `resources/js/pages/customer/registers/index.tsx`
- Create: `resources/js/pages/customer/registers/session.tsx`
- Create: `resources/js/pages/customer/marketplace-settlements/index.tsx`
- Modify: `resources/js/pages/customer/pos/index.tsx`
- Modify: `resources/js/pages/customer/pos/types.ts`
- Modify: `resources/js/pages/customer/sales/index.tsx`
- Modify: `resources/js/pages/customer/sales/show.tsx`
- Modify: `resources/js/pages/customer/stores/index.tsx`
- Modify: `resources/js/pages/customer/stores/show.tsx`
- Modify: all catalogs in `resources/js/lang/*/customer.ts`.
- Create/modify focused frontend tests under `tests/Frontend/`.

**Interfaces:**
- Consumes shared `activeBusiness`, Store, capability, terminal actor, Register, payment, and marketplace props.
- Produces responsive Operate-mode surfaces with no duplicate navigation truth.

- [x] **Step 1: Write failing frontend contract tests**

Cover capability filtering, single-Business switcher suppression, channel-dependent payment choices, PIN input semantics, safe-area classes, staff form progressive disclosure, and cashier label formatting.

Run:

```bash
npm run test:units
```

Expected: FAIL on new contract expectations.

- [x] **Step 2: Implement the compact Business/Store switcher**

Reuse the current header and menu primitives. Hide it when both collections have one accessible choice. On switch, use Wayfinder routes and clear incompatible local POS state.

- [x] **Step 3: Implement Team and activity surfaces**

Primary form order is Name, Role, Stores, six-digit PIN, optional personal-device access. Reveal email only when personal-device access is enabled. On mobile use fullscreen focused flow; on wider screens use the established dialog. Staff detail shows scoped operational history and never renders PIN/password values.

- [x] **Step 4: Implement terminal lock and Register flow**

Use a portrait-safe staff picker and six-digit keypad with visible focus, error text, loading state, throttled/locked state, and 44 px controls. POS header displays translated `Cashier · Register · Shift` state. Switch-user returns to lock without exposing back-office navigation.

- [x] **Step 5: Implement dynamic Store/Marketplace checkout and settlement UI**

Store channel shows only valid configured payments. Marketplace channel shows only enabled marketplaces plus required external order number and clearing summary. Settlement form shows gross, fee, refund adjustment, derived net, destination account, eligible Sales, and immutable confirmation.

- [x] **Step 6: Add every translation key to every locale**

Update English, Indonesian, Malay, Filipino, Vietnamese, Khmer, Lao, Burmese, Tetum, and Thai catalogs. Preserve brand names and user data. Do not alias a non-English catalog to English.

- [x] **Step 7: Run frontend formatting, detection, and verification**

Run:

```bash
npm run format
node /home/muhammmad-genta/.codex/skills/impeccable/scripts/detect.mjs --json resources/js/layouts/customer resources/js/pages/customer/team resources/js/pages/customer/registers resources/js/pages/customer/marketplace-settlements resources/js/pages/customer/pos/index.tsx resources/js/pages/customer/sales resources/js/pages/customer/stores
npm run test:units
npm run i18n:check
npm run types:check
npm run lint:check
npm run format:check
npm run build
```

Expected: detector has no unresolved blocking findings; all commands exit 0.

- [x] **Step 8: Verify responsive webview states**

Inspect 320, 375, 640, 768, 1024, 1280, and 1536 px for login/PIN, staff form, Store switcher, POS checkout, Register close, and settlement. Verify no page overflow, clipped translated action, keyboard-obscured submit, hover-only action, or unsafe-area collision. Record any defect as a failing frontend test before fixing it.

---

### Task 15: Build Business-Centered Super Admin and Commerce Reference Management

**Files:**
- Create: `app/Http/Controllers/Platform/BusinessController.php`
- Create: `app/Http/Controllers/Platform/CommerceReferenceController.php`
- Create: focused platform Form Requests.
- Modify: `app/Support/PlatformPermission.php`
- Modify: `routes/platform.php`
- Modify: platform navigation/layout components.
- Create: `resources/js/pages/platform/businesses/index.tsx`
- Create: `resources/js/pages/platform/businesses/show.tsx`
- Create: `resources/js/pages/platform/commerce/index.tsx`
- Modify: `resources/js/pages/platform/users/index.tsx`
- Modify: `resources/js/pages/platform/stores/index.tsx`
- Modify: `resources/js/pages/platform/subscriptions/index.tsx`
- Modify: platform translation catalogs used by these pages.
- Modify: `tests/Feature/SuperAdminTest.php`

**Interfaces:**
- Produces Business view/status/audit/device-revoke/reference-management platform permissions.
- Consumes existing platform middleware, 2FA, Spatie permissions, and Admin Audit Log.

- [x] **Step 1: Write failing platform permission and safety tests**

Cover Business listing/detail, permission denial, 2FA gate, suspension/restore audit, device revoke, ownership recovery audit, reference enable/disable, inability to view PIN/token, and refusal to delete User/Store with posted tenant history.

- [x] **Step 2: Run Super Admin tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/SuperAdminTest.php
```

Expected: FAIL because Business/reference routes do not exist.

- [x] **Step 3: Add granular platform permissions and controllers**

Add constants/groups for Business view/status/audit, device revoke, ownership recovery, and commerce reference management. Route every mutation through existing platform middleware, 2FA, permission middleware, throttling, validation, and `RecordAdminAudit`.

- [x] **Step 4: Build linked, non-duplicated platform pages**

Business detail is canonical. Existing User, Store, Subscription, and Payment pages link to it rather than copying Business mutation controls. Commerce page manages country availability and active status but cannot rewrite historical snapshots.

- [x] **Step 5: Verify Task 15**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/SuperAdminTest.php tests/Feature/PlatformSettingTest.php tests/Feature/CountryCurrencyTest.php tests/Feature/ProductionReadinessTest.php
npm run types:check
npm run lint:check
```

Expected: PASS.

---

### Task 16: Add Rerunnable Production-Safe Reference and Initial Business Seeders

**Files:**
- Modify: `database/seeders/DatabaseSeeder.php`
- Modify: `database/seeders/PlanSeeder.php` only if Business ownership requires call-site adjustment; do not change free limits.
- Modify: `database/seeders/CountryCommerceSeeder.php`
- Create: `database/seeders/BusinessPermissionSeeder.php`
- Create: `database/seeders/InitialBusinessSeeder.php`
- Create: `config/initial-businesses.php`
- Add/modify relevant model factories.
- Create: `tests/Feature/InitialBusinessSeederTest.php`

**Interfaces:**
- All configured seeding is safe in every environment and idempotent.
- Initial seeding creates the approved Indonesia and Malaysia Businesses in production as well as development without overwriting existing data.

- [x] **Step 1: Write failing seeder safety/idempotency tests**

Cover two consecutive runs with stable counts and balances, successful production execution with valid configuration, safe rejection of missing/weak first-run secrets, unchanged Plan limits, correct country/currency/payment/marketplace assignments, one POS-only Cashier per Business, balanced ledgers, pending/posted Settlements, preservation of existing passwords/PINs/roles/settings, full rollback on a seeded-tenant failure, and conflict diagnostics instead of silent reassignment.

- [x] **Step 2: Run the seeder test and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/InitialBusinessSeederTest.php
```

Expected: FAIL because the new reference/initial-business seeders do not exist.

- [x] **Step 3: Implement production-safe seeding**

`DatabaseSeeder` calls the safe reference seeders and `InitialBusinessSeeder` in every environment. `config/initial-businesses.php` contains stable public IDs, emails, roles, Store/country assignments, and environment variable names for first-run secrets. Reference seeders use stable codes and do not overwrite tenant choices.

- [x] **Step 4: Implement exact production-safe initial identities and business data**

Create:

```text
admin@example.com        initial Platform Admin
test@example.com         Indonesia Business Owner
genta@xsisten.com        Indonesia Business Admin
manager.id@example.test  Indonesia Manager
cashier.id@example.test  Indonesia claimed Cashier
one POS-only Indonesia Cashier membership

owner.my@example.test    Malaysia Business Owner
manager.my@example.test  Malaysia Manager
cashier.my@example.test  Malaysia claimed Cashier
one POS-only Malaysia Cashier membership
```

Use domain actions for posted Purchases, Sales, cash, Register, returns, expenses, and Settlements so balances obey production invariants. Use stable configured IDs and deterministic idempotency keys. If `test@example.com` or `genta@xsisten.com` already exists, preserve its password and higher platform authority; validate its Business membership and fail on conflict rather than moving or duplicating it.

For a missing identity, read its bootstrap password/PIN from the configured environment variable, reject absent/weak/default values in production, and never replace credentials on subsequent runs. Never print secrets.

- [x] **Step 5: Verify Task 16**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/InitialBusinessSeederTest.php tests/Feature/SubscriptionManagementTest.php tests/Feature/MarketplaceSettlementTest.php tests/Feature/RegisterSessionTest.php
```

Expected: PASS in repeated and production-environment tests with deterministic counts/balances and preserved existing data.

---

### Task 17: Enforce Full-Account Email Verification and Finalize Canonical Schema

**Files:**
- Modify: `app/Models/User.php`
- Modify: `tests/Feature/Auth/EmailVerificationTest.php`
- Create: `database/migrations/2026_09_16_100000_finalize_business_tenancy.php`
- Modify: models/controllers/actions to remove old owner/User actor accessors.
- Modify: `docs/00_PRODUCT_SCOPE.md`
- Modify: `docs/01_BUSINESS_RULES.md`
- Modify: `docs/02_ARCHITECTURE.md`
- Modify: `docs/03_DATABASE_STANDARDS.md`
- Modify: `docs/04_SECURITY_TENANCY.md`
- Modify: `docs/06_UI_UX_STANDARDS.md`
- Modify: `docs/07_DECISIONS.md`
- Modify: `docs/08_GLOSSARY.md`

**Interfaces:**
- Produces final schema with Business as sole owner and Business Membership as sole tenant actor.
- Removes permanent dual-write/read compatibility paths.

- [x] **Step 1: Write failing email-verification and no-legacy-path tests**

Assert unverified full Users are redirected to verification, verified Users can enter Business portal, POS-only members are unaffected, Store has no authoritative owner relation, Subscription has no authoritative User owner, and new operational records cannot be created with only `created_by_user_id`.

- [x] **Step 2: Run tests and confirm the red state**

Run:

```bash
php artisan test --compact tests/Feature/Auth/EmailVerificationTest.php tests/Feature/BusinessTenancyTest.php tests/Feature/OperationalActorBackfillTest.php
```

Expected: FAIL while User does not implement `MustVerifyEmail` and legacy columns remain canonical.

- [x] **Step 3: Enforce verified full accounts**

Change the model declaration to implement `Illuminate\Contracts\Auth\MustVerifyEmail`. Keep existing unverified real accounts unverified and route them through the verification flow; configured initial accounts are explicitly verified.

- [x] **Step 4: Validate then remove superseded columns and constraints**

Before dropping, assert no null Business IDs/actor IDs in non-legacy-required records and rerun balance/count reconciliation. Remove:

```text
stores.owner_user_id
store_memberships.user_id
subscription ownership user_id columns replaced by business_id
tenant operational actor user_id columns replaced by membership actor columns
runtime config marketplace/payment catalog arrays
redundant owner Store-membership rows
```

Preserve platform/commercial `created_by_user_id` where it records a Platform Admin action.

- [x] **Step 5: Update canonical documentation**

Replace obsolete Store-as-tenant and User-scoped subscription rules with the approved Business design. Record the exact decision and consequences; do not claim excluded vertical/API features exist.

- [x] **Step 6: Verify Task 17**

Run:

```bash
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/Auth/EmailVerificationTest.php tests/Feature/BusinessTenancyTest.php tests/Feature/BusinessTenancyBackfillTest.php tests/Feature/OperationalActorBackfillTest.php tests/Feature/SubscriptionManagementTest.php
```

Expected: PASS with no fallback to removed ownership/actor columns.

---

### Task 18: Full Verification, Responsive QA, and Checklist Closure

**Files:**
- Modify only files required to fix failures discovered by the commands below.
- Update checkbox state in this plan immediately after each verified step.

**Interfaces:**
- Produces a verified working tree implementing the spec with no automatic commit.

- [x] **Step 1: Run migration verification on an isolated test database**

Run both a clean migration/seed path and the legacy-fixture upgrade test suite. Never run `migrate:fresh` against an unknown database.

```bash
php artisan test --compact tests/Feature/BusinessTenancyBackfillTest.php tests/Feature/OperationalActorBackfillTest.php tests/Feature/InitialBusinessSeederTest.php
```

Expected: PASS with preserved counts, balances, and deterministic seed data.

- [x] **Step 2: Run PHP formatting and static analysis**

Run:

```bash
vendor/bin/pint --dirty --format agent
composer lint:check
composer types:check
```

Expected: all commands exit 0.

- [x] **Step 3: Run all frontend quality gates**

Run:

```bash
npm run test:units
npm run i18n:check
npm run types:check
npm run lint:check
npm run format:check
npm run build
```

Expected: all commands exit 0.

- [x] **Step 4: Run the complete PHP suite in parallel**

Run:

```bash
php artisan test --parallel --processes=10
```

Expected: zero failures and zero errors.

- [x] **Step 5: Run the repository CI aggregate**

Run:

```bash
composer ci:check
```

Expected: exit 0.

- [x] **Step 6: Perform bounded responsive/webview confirmation**

Verify the exact surfaces and widths from Task 14 in one desktop/mobile inspection batch, fix all observed defects in one batch with regression coverage, then perform at most one confirmation batch. Confirm safe-area behavior, keyboard behavior, focus, translated expansion, and no overflow.

- [x] **Step 7: Review the final diff against KISS/DRY and the spec**

Run:

```bash
git diff --check
git status --short
git diff --stat
rg -n "owner_user_id|created_by_user_id|config\('sales\.(marketplaces|qr_payments|country_wallets)" app routes resources tests database --glob '!database/migrations/2026_09_16_*.php'
rg -n "T[B]D|T[O]DO|FIX[M]E" app routes resources tests database docs/superpowers
```

Expected:

- no whitespace errors;
- no unexpected files;
- no operational caller uses superseded owner/User actor/catalog paths;
- no placeholder remains;
- no duplicate role matrix, navigation list, or country catalog;
- no unrelated redesign or dependency change.

- [x] **Step 8: Report completion without committing**

Report exact test/build results, migration reconciliation evidence, responsive surfaces checked, remaining excluded scope, and the working-tree file summary. Do not commit, push, or open a PR unless the user explicitly requests it.
