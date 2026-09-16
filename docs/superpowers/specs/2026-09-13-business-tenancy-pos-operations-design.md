# Business Tenancy, Staff POS, and Southeast Asia Commerce Design

**Date:** 2026-09-13
**Status:** Approved for implementation
**Execution:** Implement completely on the currently active branch. Do not create a commit or push; leave the fully verified working tree for the user to test first.
**Scope:** Business tenancy, staff identity and authorization, POS devices and register sessions, Southeast Asia payment and marketplace reference data, manual marketplace settlement, platform administration, backfill, production-safe initial data, localization, and responsive customer UI.

## 1. Purpose

Sisko Plan already has a reliable store-scoped retail core: catalog, inventory, purchasing, sales, returns, cash, expenses, operational reporting, audit records, and account-scoped subscription limits. This design changes the SaaS ownership boundary from an individual user to a Business and completes the minimum staff and cash-register workflow required for a real multi-cashier POS.

The design supports:

- one user participating in multiple businesses;
- one business operating stores in multiple Southeast Asian countries;
- a small owner-operated shop with no extra navigation or setup burden;
- shared store devices with personal cashier PINs;
- personal devices for staff who have full user accounts;
- business-level subscriptions and limits;
- country-specific payment methods and marketplaces;
- manual, auditable marketplace clearing and settlement;
- later service, restaurant, inventory-tracking, B2B supplier, and enterprise role extensions without changing the tenant boundary again.

This remains a Laravel modular monolith with Inertia and React. It does not introduce microservices, a generic workflow engine, a generic role builder, or separate applications for each industry.

## 2. Design principles

1. **One canonical owner boundary:** Business owns stores, subscriptions, entitlements, and future referrals. `stores.owner_user_id` is removed after cutover.
2. **One canonical operational actor:** tenant operations reference a Business Membership, not a global User. This permits POS-only staff and preserves the staff identity shown in historical activity.
3. **Store remains the operational boundary:** products, stock, sales, purchases, cash, expenses, and reports remain store-scoped. Business access grants a set of accessible stores; it does not remove store scoping.
4. **Roles are contextual:** platform permissions, business roles, and store roles are separate. A platform administrator is not implicitly a tenant owner.
5. **Capabilities are centralized:** policies map the small role set to named capabilities. Controllers and pages do not scatter raw role comparisons.
6. **PIN is a terminal credential:** a PIN can unlock an activated POS device but cannot authenticate a user from an arbitrary browser.
7. **Posted documents remain immutable:** current server-authoritative totals, ledger writes, idempotency, and reversal rules are preserved.
8. **Country and language are independent:** store country selects operational reference data; user locale selects interface language.
9. **Historical commercial meaning is snapshotted:** currency, marketplace identity, and staff display name do not change when current configuration changes.
10. **Progressive disclosure:** a one-business, one-store owner retains the current direct experience. Switchers and advanced controls appear only when useful.

## 3. Scope boundaries

### 3.1 Included

- Business tenant and membership model.
- Business-scoped subscriptions, periods, add-ons, scan usage, and plan limits.
- Owner, Admin, Manager, and Cashier roles.
- POS-only staff with optional account claiming.
- Store assignments.
- Activated POS devices, registers, PIN unlock, and manager approval.
- Register sessions, opening cash, drawer movements, closing count, and variance.
- Staff attribution and owner-visible staff activity.
- Southeast Asia country, currency, timezone, locale, payment-method, and marketplace reference data.
- Store-enabled marketplaces.
- Marketplace clearing accounts and manual settlements.
- Currency and marketplace snapshots on new financial documents.
- Country/currency change protection after operational posting.
- Customer and platform UI changes required by this design.
- Existing-data backfill and deterministic production-safe seeders.
- Responsive webview behavior and all configured translations.

### 3.2 Explicitly excluded

- Marketplace OAuth, order import, webhooks, catalog sync, inventory sync, price sync, and shipping integrations.
- Non-inventory service items.
- Draft, open, work, kitchen, or table orders.
- Split tender, partial customer payments, deposits, and customer receivables.
- Customer directory expansion and loyalty.
- Tax, service charge, gratuity, and automatic currency conversion.
- Restaurant, laundry, appointment, batch, expiry, serial-number, and IMEI modules.
- Supplier/distributor marketplace and trade-order fulfillment.
- Payroll, statutory attendance, and employee surveillance.
- Custom tenant role builder.
- Microservices or new application dependencies.

These exclusions are later bounded modules. They do not require another tenancy redesign when this design is implemented.

## 4. Domain model

### 4.1 Business

`businesses` becomes the SaaS tenant and commercial customer.

Required fields:

| Field | Purpose |
|---|---|
| `id`, `public_id` | Internal and public identity |
| `name` | User-facing business name |
| `status` | `active`, `suspended`, or `archived` |
| timestamps | Lifecycle history |

Business deliberately has no single operational country, currency, timezone, or industry enum. A Business can have stores in different countries and may later enable more than one industry capability. Billing localization for a future paid multi-currency catalog is a separate commercial design; the current free plan is unaffected.

`stores` gains a required `business_id`. Country, currency, timezone, locale, settings, and operational data remain on the Store or its settings.

Operational tables continue to use `store_id`; they do not duplicate `business_id`. Access begins from the authenticated Business Membership and resolves only stores that membership may use.

### 4.2 Business Membership

`business_memberships` is the canonical identity of a person inside a business.

Required fields:

| Field | Purpose |
|---|---|
| `id`, `public_id` | Actor identity and safe URLs |
| `business_id` | Tenant scope |
| `user_id`, nullable | Full web account when claimed |
| `display_name` | Business-specific staff name and historical source |
| `business_role` | `owner`, `admin`, or `staff` |
| `status` | `invited`, `active`, or `suspended` |
| `pos_pin_hash`, nullable | Personal six-digit PIN hash |
| `pin_changed_at`, nullable | Credential lifecycle |
| `invited_at`, `joined_at`, nullable | Account lifecycle |
| timestamps | Administrative history |

Rules:

- A claimed User has at most one membership per Business.
- A Business has at least one active Owner.
- The last active Owner cannot be removed, suspended, or demoted.
- Owners and Admins have access to every active Store in their Business.
- `staff` requires one or more Store assignments before operational access.
- A POS-only membership has `user_id = null`, is active, and has a PIN.
- Claiming a POS-only membership attaches a User; it does not create a replacement membership or lose history.
- `display_name` belongs to the membership so the same User can use an appropriate business identity in different businesses.
- PIN hashes are never returned by controllers, Inertia props, audit metadata, seed output, or logs.

### 4.3 Store Assignment

The existing `store_memberships` table is migrated into a Store-assignment table by replacing `user_id` with `business_membership_id`.

Its operational roles are:

- `manager`
- `cashier`

There is one assignment per Business Membership and Store. A membership can have different store roles in different stores. Business Owners and Admins inherit access and do not require duplicate assignments.

Existing role mapping is deterministic:

| Existing store role | New result |
|---|---|
| `owner` | Business Membership `owner`; redundant Store assignment removed |
| `admin` | Business Membership `staff` plus Store assignment `manager` |
| `cashier` | Business Membership `staff` plus Store assignment `cashier` |

Existing `admin` is not promoted to Business Admin because its current authority is store-specific and does not include ownership or billing.

### 4.4 Canonical operational actor

All tenant-domain actor columns move from User to Business Membership, including actors on:

- stock adjustments and stock movements;
- account transfers, capital transactions, and cash transactions;
- purchases, purchase payments, and payable transactions;
- sales, sale payments, and sale returns;
- expenses;
- stock counts and their completion, posting, cancellation, and reopening transitions;
- register sessions and drawer movements;
- tenant audit logs.

New columns use explicit names such as `created_by_business_membership_id`. Historical document presentation also stores a short actor display-name snapshot where receipts or externally meaningful records show a cashier name. The membership foreign key remains authoritative for filtering and audit; the snapshot remains authoritative for historical display.

Platform-created subscription records continue to reference the platform User actor because they belong to the platform domain, not the tenant operational actor model.

## 5. Authorization model

### 5.1 Separate authorization contexts

There are three independent contexts:

1. **Platform:** existing `platform_role`, platform middleware, Spatie permissions, and platform audit logs.
2. **Business:** Owner/Admin/Staff membership and business lifecycle capabilities.
3. **Store:** Manager/Cashier assignment and store operational capabilities.

A User may technically hold both platform permissions and Business Memberships, but one context never grants authority in another. Platform impersonation creates an audited support context; it does not convert platform permission into tenant ownership.

### 5.2 Initial capability matrix

Policies expose named abilities; navigation consumes a serialized subset of the same abilities.

| Capability | Owner | Admin | Manager | Cashier |
|---|:---:|:---:|:---:|:---:|
| View Business and all Stores | Yes | Yes | Assigned | Assigned |
| Transfer ownership/archive Business | Yes | No | No | No |
| Manage subscription and limits | Yes | No | No | No |
| Invite/suspend Business members | Yes | Yes | No | No |
| Assign Store roles | Yes | Yes | No | No |
| Manage Store settings | Yes | Yes | Assigned | No |
| Manage catalog, inventory, purchasing | Yes | Yes | Assigned | No |
| View costs, cash balances, expenses, reports | Yes | Yes | Assigned | No |
| Activate/revoke Store POS devices | Yes | Yes | Assigned | No |
| Open/close own register session | Yes | Yes | Yes | Yes |
| Checkout | Yes | Yes | Yes | Yes |
| Search customers during checkout | Yes | Yes | Yes | Yes |
| View all Store sales | Yes | Yes | Assigned | No |
| View own current-session receipts | Yes | Yes | Yes | Yes |
| Approve void, return, large discount, drawer adjustment | Yes | Yes | Yes | No |
| View team activity and cash variance | Yes | Yes | Assigned Store | Own session only |

The first implementation centralizes this fixed matrix in policies or a domain catalog with direct callers. It does not store editable permissions for tenant roles and does not expose a custom-role UI.

Discount approval uses a Store setting for the threshold, with a conservative default. Any discount at or below the threshold follows the Cashier capability; any higher discount requires a Manager, Admin, or Owner approval. The server calculates the discount percentage and enforces approval regardless of client state.

## 6. Authentication, devices, and PIN

### 6.1 Full web login

Full User authentication remains the only way to:

- enter the owner/admin/manager back office from an arbitrary device;
- activate or reassign a POS device;
- manage Business and Store configuration;
- manage subscription and staff;
- claim a POS-only membership.

Existing password, Google, passkey, rate-limit, session-regeneration, and 2FA behavior remain in their current portal boundaries. Full tenant User accounts implement and enforce `MustVerifyEmail`, matching the existing `verified` route boundary. Existing unverified full accounts are directed through the verification flow rather than silently marked verified; configured initial accounts are seeded as verified. POS-only memberships do not have email verification because they have no email login.

### 6.2 POS device activation

`pos_devices` represents a browser/webview authorized for one Store.

Required fields:

| Field | Purpose |
|---|---|
| `id`, `public_id` | Device identity |
| `business_id`, `store_id` | Tenant and operational scope |
| `name` | Example: `Kasir Depan` |
| `token_hash` | Hash of the opaque device credential |
| `status` | `active` or `revoked` |
| `activated_by_business_membership_id` | Accountable activator |
| `last_seen_at`, `revoked_at` | Lifecycle and support |
| timestamps | Audit |

Activation requires an Owner, Admin, or assigned Manager using full web authentication. The server issues an opaque random token, stores only its hash, and sends it in a Secure, HttpOnly, SameSite cookie. Entering terminal mode clears the full back-office authentication session from that browser so a shared register never retains owner authority.

A device is bound to one Store and one selected Register. Moving it requires authenticated reactivation. Revocation invalidates the device on its next request. No browser fingerprinting is used.

### 6.3 PIN unlock

Every active POS operator uses a personal six-digit numeric PIN. The activated device first presents active staff assigned to its Store; the operator selects their name and enters the PIN. Selecting the staff identity before verification avoids storing a queryable PIN digest or requiring globally unique PINs.

PIN verification:

- uses Laravel password hashing;
- is rate-limited by device and membership;
- temporarily locks repeated failures;
- records success, failure aggregate, reset, and lock events without recording the PIN;
- creates a narrow POS actor session bound to device, Store, and membership;
- returns to the PIN lock screen after configurable inactivity or explicit switch-user action.

A POS-only staff member cannot use the PIN on an unactivated device. A claimed staff User may use full login on a personal device, but still selects a Register and opens a register session before in-store checkout.

Manager approval verifies an eligible approver and PIN for one named action. It records the approver, action, target, cashier, device, and timestamp without replacing the active Cashier session.

## 7. Registers and register sessions

### 7.1 Register

`registers` belongs to one Store and one active cash Financial Account.

Required fields:

- `id`, `public_id`, `store_id`;
- `name`;
- `cash_financial_account_id`;
- `status` (`active`, `inactive`);
- timestamps.

A Store may start with one default Register. Multiple registers can use distinct cash accounts; the system does not merge physical drawer accountability implicitly.

### 7.2 Register session

`register_sessions` records responsibility for a bounded POS operating period.

Required fields:

- `id`, `public_id`, `store_id`, `register_id`;
- `opened_by_business_membership_id`;
- `closed_by_business_membership_id`, nullable;
- `currency_code` snapshot;
- `opening_cash`;
- `expected_cash`, nullable until close;
- `counted_cash`, nullable until close;
- `variance`, nullable until close;
- `opened_at`, `closed_at`;
- `status` (`open`, `closed`);
- timestamps.

Opening locks the Register row and rejects a second open session. Closing locks the Register and session, derives expected cash on the server, accepts the physical count, calculates variance, and stores immutable closing snapshots.

`register_drawer_movements` records `cash_in` and `cash_out` with amount, reason, actor, approval actor when required, and timestamp. Each drawer movement posts the corresponding cash ledger mutation atomically. Editing or deleting a posted drawer movement is prohibited; correction uses a reversing movement.

Expected cash is derived from:

```text
opening cash
+ cash sales
+ cash-in drawer movements
- cash refunds
- cash-out drawer movements
```

Every new in-store POS Sale references its active Register Session, regardless of payment rail. A cash sale must post to the Register's configured cash account. Marketplace entries may reference the active session when entered at a terminal, but marketplace settlement never changes drawer cash.

Legacy Sales remain valid with a nullable `register_session_id` and display `Legacy / no register session`. New in-store POS posts require a valid open session after cutover.

## 8. Multi-country and localization

### 8.1 Supported geography

The supported country set remains the existing Southeast Asia catalog:

- Brunei (`BN`)
- Cambodia (`KH`)
- Indonesia (`ID`)
- Laos (`LA`)
- Malaysia (`MY`)
- Myanmar (`MM`)
- Philippines (`PH`)
- Singapore (`SG`)
- Thailand (`TH`)
- Timor-Leste (`TL`)
- Vietnam (`VN`)

Country codes use ISO 3166-1 alpha-2, currencies use ISO 4217, and timezone values use IANA identifiers.

### 8.2 Locale behavior

The configured interface locales remain:

- English, Indonesian, Malay, Filipino, Vietnamese, Khmer, Lao, Burmese, Tetum, and Thai.

User locale controls application chrome. Store locale controls the initial receipt preference and other store-authored defaults. Country provides a first-run suggestion only; it never permanently forces language. Stable brand names, store names, product names, SKUs, barcodes, and external document numbers are not translated.

Every new user-facing key is implemented in every configured locale in the same change. Layouts account for translated text expansion and do not truncate required primary actions.

### 8.3 Currency snapshots and Store mutation

Money continues to use `DECIMAL(19,4)`. Currency code snapshots are added to the headers that independently carry monetary meaning, including Sales, Sale Payments, Sale Returns, Purchases, Purchase Payments, Expenses, Cash Transactions, Account Transfers, Capital Transactions, Register Sessions, and Marketplace Settlements.

The snapshot is server-derived from the Store when posting. Clients cannot submit or override it.

Country/currency changes are allowed only before the Store has any posted stock or financial ledger activity. After posting begins, the current Store keeps its country and currency. A business that begins operating in another country creates another Store. Timezone changes remain allowed because stored timestamps remain UTC; reports render them using the current Store timezone and document period keys retain their stored identity.

Cross-store Business summaries group monetary totals by currency. They never add unlike currencies. Automatic FX conversion is out of scope.

## 9. Country payment catalog

### 9.1 Reference model

Country-specific payment availability moves from hard-coded configuration to small platform-managed reference tables because availability changes independently of releases.

`payment_methods` fields:

- `id`, stable `code`, brand `name`;
- `kind`: `national_qr` or `e_wallet`;
- `is_active`;
- timestamps.

`country_payment_methods` fields:

- `country_id`, `payment_method_id`;
- `is_active`;
- unique country/method pair;
- timestamps.

Cash and bank transfer remain generic Financial Account behavior and do not need one database row per country. Store Financial Accounts may optionally reference a country-enabled Payment Method. Unknown or unverified providers remain user-named Bank/E-wallet accounts without a platform code.

The initial reference seeder preserves the currently supported verified mappings:

- Indonesia: QRIS;
- Malaysia: DuitNow QR and Touch 'n Go eWallet;
- Thailand: PromptPay QR;
- Vietnam: VietQR.

All other supported countries retain Cash, user-defined Bank/E-wallet accounts, and marketplace `Other` until a provider mapping is verified and activated by a Platform Admin. The product does not fabricate national payment support.

### 9.2 Runtime rules

The POS returns only payment choices that are:

1. compatible with the active Store country;
2. active at platform level;
3. configured as an active Store Financial Account;
4. compatible with the selected sales channel.

Server validation repeats these rules. Disabling a reference prevents new selection but does not invalidate or relabel historical payments.

## 10. Marketplace catalog and settlement

### 10.1 Marketplace reference model

`marketplaces` fields:

- `id`, stable `code`, brand `name`;
- `is_active`;
- timestamps.

`country_marketplaces` fields:

- `country_id`, `marketplace_id`;
- `is_active`;
- unique country/marketplace pair;
- timestamps.

`store_marketplaces` fields:

- `store_id`, `marketplace_id`;
- `is_enabled`;
- unique Store/marketplace pair;
- timestamps.

The initial seeder preserves the existing country catalog:

- Indonesia: Shopee, Tokopedia, Blibli, Lazada, Other;
- Malaysia: Shopee, Lazada, TikTok Shop, Other;
- Thailand: Shopee, Lazada, TikTok Shop, Other;
- Vietnam: Shopee, TikTok Shop, Lazada, Other;
- every other supported country: Other.

This is intentionally conservative. Platform Admin can add a verified provider and country availability without deployment. Owner/Admin enables only the marketplaces a Store uses, keeping the checkout compact.

### 10.2 Sale rules

Marketplace is a sales channel, not a payment rail. A marketplace Sale requires:

- a country-enabled and Store-enabled marketplace;
- an external order number;
- uniqueness of `(store_id, marketplace_id, external_order_number)`;
- server-derived Store currency;
- immutable snapshots of marketplace code and name;
- posting to the provider's Marketplace Clearing Financial Account.

The marketplace clearing account becomes an explicit `marketplace_clearing` Financial Account type instead of masquerading as an e-wallet. There is one active clearing account per Store and Marketplace.

Existing marketplace sales are backfilled from `marketplace_code`. Existing provider accounts are converted from e-wallet to marketplace clearing only when `marketplace_code` is present. Unknown legacy codes link to the `Other` marketplace while preserving their original code/name snapshots.

### 10.3 Manual settlement

`marketplace_settlements` fields:

- `id`, `public_id`, `store_id`, `marketplace_id`;
- `destination_financial_account_id`;
- immutable `marketplace_code`, `marketplace_name`, and `currency_code`;
- provider settlement reference;
- `gross_amount`, `fee_amount`, `refund_adjustment_amount`, and `net_amount`;
- `settled_at`;
- `status`: `posted` or `reversed`;
- `idempotency_key`, `request_hash`;
- `created_by_business_membership_id`;
- timestamps.

`marketplace_settlement_sales` links Sales to a Settlement and records the allocated gross amount. A Sale cannot be allocated beyond its remaining unsettled clearing amount.

Posting a Settlement is one atomic action that:

1. validates Store, Marketplace, currency, eligible Sales, and destination account;
2. locks the selected clearing balance and Sales allocations;
3. validates `gross - fees - refund adjustments = net` using decimal-safe arithmetic;
4. transfers the net amount from clearing to the destination account;
5. records marketplace fees through the existing expense/cash-ledger path against the clearing account;
6. records the Settlement and Sale allocations;
7. writes tenant audit metadata without credentials or uploaded secrets.

Settlement correction uses reversal. Posted Settlement values are not edited. Provider API reconciliation remains out of scope.

## 11. Subscription and entitlement migration

Subscription ownership moves from `user_id` to `business_id` across:

- subscriptions;
- subscription periods;
- subscription add-ons;
- subscription payments;
- scan usages and scan events.

The current free plan remains unchanged:

- one Store;
- 1,000 active products aggregated across Business Stores;
- one distinct active staff member excluding Business Owners;
- 100 AI scans per explicit usage period;
- lifetime base entitlement.

An Admin, Manager, or Cashier consumes one staff seat once per Business, regardless of how many Stores they are assigned. A suspended or invited membership does not consume an active seat. A POS-only membership and claimed membership are the same seat because claiming preserves the membership row.

Scan periods use explicit UTC `period_start` and `period_end` from subscription period policy rather than a hard-coded Jakarta calendar boundary. Scan events keep Store attribution and Business ownership.

Creating or activating membership and Store capacity is checked before form display and again under a Business row lock during mutation. Existing historical subscription records retain their plan snapshots.

## 12. Customer portal experience

### 12.1 Shell and navigation

The existing customer shell, tokens, navigation contract, page headers, forms, dialogs, sheets, and route generation remain authoritative.

- One accessible Business and one Store: no Business/Store switcher is shown; entry remains direct.
- Multiple Businesses or Stores: a single compact switcher displays Business, Store, country, and currency.
- Switching Business clears incompatible Store, POS actor, Register, and cached tenant state.
- Navigation uses server-provided capabilities from the active context.
- Cashier navigation is limited to POS, current-session receipts, customer lookup needed by checkout, shift, and own profile.
- Owner/Admin gains `Tim & Aktivitas` and `Perangkat & Register` management.
- Manager sees only assigned Store management and team activity.

### 12.2 Staff management

The primary add-staff flow asks only:

1. name;
2. role (`Manager` or `Cashier` for Store staff; Business Admin is an advanced owner action);
3. Store assignments;
4. six-digit PIN;
5. optional `Allow login from a personal device`, which reveals email/invitation fields.

Owner/Admin can suspend, reactivate, change allowed role/Store assignments, reset PIN, resend an invitation, and revoke user/device sessions. PIN and password values are never retrievable.

The staff detail/activity view shows role, Stores, status, last active time, open session, sales count/value, discounts, returns, void approvals, drawer adjustments, closing variances, and audit events. Owner/Admin can view all Business members; Manager is limited to assigned Stores; Cashier sees only their own current session. The product does not add employee ranking, geolocation, screenshots, or payroll claims.

### 12.3 POS terminal experience

On an activated shared terminal:

1. lock screen shows assigned active staff;
2. staff selects their name and enters PIN;
3. staff selects or resumes a Register session;
4. POS opens with a compact `Cashier · Register · Shift` status;
5. switch-user returns to the PIN screen without exposing back-office navigation.

Sales channel remains a two-choice control: Store or Marketplace. Choosing Store reveals only valid Store payment methods. Choosing Marketplace reveals only Store-enabled marketplaces and the external order number; payment is represented as Marketplace Clearing without an irrelevant Cash/QR choice.

### 12.4 Responsive webview requirements

All new customer surfaces are Operate-mode interfaces and preserve the incumbent visual system.

- Support 320, 375, 640, 768, 1024, 1280, and 1536 px viewports.
- Minimum touch target is 44 px.
- Respect safe-area insets and virtual-keyboard occlusion.
- Use a bottom sheet for short mobile choices, a fullscreen mobile flow for staff/register setup, and a centered dialog on wider layouts.
- Do not create horizontal page overflow, clipped translated actions, or hover-only controls.
- Preserve visible focus, labels, status text independent of color, and reduced-motion behavior.
- Dense owner activity tables become stacked records or intentionally scrollable data regions on narrow screens; primary actions remain visible.
- The PIN keypad and POS lock screen are usable in portrait webview without page zoom.
- New internal navigation and form actions use Wayfinder-generated functions.

No broad visual redesign is part of this work.

## 13. Platform administration

The existing Super Admin portal remains separate and adds a Business-centered view.

### 13.1 Business administration

Platform Admin capabilities are added for:

- viewing Businesses;
- changing Business status;
- viewing tenant audit metadata;
- viewing and revoking POS devices;
- performing audited ownership recovery;
- maintaining payment-method and marketplace reference availability.

The Business list/detail exposes:

- Business name and status;
- owner and member summary;
- Stores with country/currency;
- subscription, periods, add-ons, and current usage;
- active device/register summary;
- last tenant activity;
- support-safe audit events.

Existing User, Store, Subscription, Payment, Geography, and Platform Admin pages link to the owning Business rather than duplicating Business management.

### 13.2 Platform safety

- Platform mutations require existing platform middleware, 2FA, granular permission, throttling, and Admin Audit Log.
- Impersonation requires permission, reason, prominent banner, and start/stop audit events.
- Platform staff cannot retrieve password/PIN values, open a cashier shift, or directly edit posted tenant Sales or ledgers.
- Business suspension blocks new operational writes and terminal unlock while preserving authorized owner reads required for recovery and subscription handling.
- Existing destructive User/Store deletion paths must refuse deletion when posted tenant history exists. Archival and explicit retention workflows replace direct financial-history purges.

## 14. Audit and observability

Tenant Audit Log gains Business Membership actor support and records:

- Business creation, status, and ownership changes;
- member invitation, claim, role, assignment, suspension, reactivation, and PIN reset;
- device activation, revocation, unlock, and user switch;
- Register-session open/close and variance;
- drawer movements and manager approvals;
- Sale cashier/Register attribution;
- high-discount, return, and void approvals;
- Store marketplace enablement;
- Settlement post and reversal.

Sensitive values, raw tokens, PINs, password data, recovery codes, and payment credentials are prohibited from audit metadata.

Platform audit remains a separate table and records cross-tenant support actions. A tenant-facing event caused during impersonation records both the Business Membership context and the impersonating Platform User.

## 15. Backfill and cutover

Backfill is additive and deterministic. It does not truncate, reset, or silently merge existing owners.

### 15.1 Additive schema

1. Create Business, Business Membership, Register/device/session, reference catalog, and Settlement tables.
2. Add nullable `business_id`, Business Membership actor columns, currency snapshots, marketplace foreign keys/snapshots, and Register Session references.
3. Keep existing columns during the data conversion only.

### 15.2 Business backfill

- Create one Business per distinct existing `stores.owner_user_id`.
- Group all Stores currently sharing an owner into that Business because current subscriptions and limits already aggregate by owner.
- Derive a deterministic Business name from the owner's first active Store, falling back to the User name.
- Create one Owner Business Membership for that User.
- Convert existing Store `admin` and `cashier` members using the mapping in section 4.3.
- Reuse one Business Membership when the same User belongs to multiple Stores under that Business.
- Fail with a diagnostic if a Store membership references a User outside the Store owner's derived Business instead of guessing.

### 15.3 Commercial and operational backfill

- Move subscription ownership and usage ownership from User to Business.
- Backfill document currency from Store settings/country.
- Backfill tenant actor columns by matching document Store and existing User membership.
- Owner-posted records map to the Owner Business Membership even when a redundant Store membership is absent.
- Fail on missing or ambiguous actor mappings; do not assign a generic system actor.
- Convert known marketplace codes and provider clearing accounts.
- Preserve unknown marketplace codes in snapshots and map the current reference to `Other`.
- Leave legacy `register_session_id` null.

### 15.4 Validation and cutover

Before making new columns required or removing old columns, verify:

- Store, membership, subscription, period, add-on, usage, and transaction row counts;
- exactly one Business for every Store;
- at least one active Owner for every Business;
- no cross-Business Store assignments;
- all tenant actors resolve to the same Business as their document Store;
- aggregate inventory quantity/value, financial balances, supplier payables, Sales totals, and Purchase totals are unchanged;
- currency snapshots match the Store currency used at cutover;
- all known marketplace codes resolve.

Application callers then switch to the new canonical columns. A final cleanup migration removes `stores.owner_user_id`, subscription/usage ownership by User, operational User actor columns, and redundant owner Store-membership rows. No compatibility accessor, dual-write path, or legacy owner fallback remains after cleanup.

## 16. Production-safe seeders and initial businesses

### 16.1 Reference seeders

Reference seeders are safe in every environment, idempotent, and maintain:

- Southeast Asia countries, currencies, default timezones, and locale suggestions;
- the existing free plan and inactive add-on offer definitions;
- platform permissions;
- payment methods and country availability;
- marketplaces and country availability;
- existing unit/category reference data.

Seeders update stable reference codes but never overwrite tenant configuration or posted history.

### 16.2 Initial business seeder

`InitialBusinessSeeder` is intentionally safe to run in production and is deterministic/idempotent. It uses stable configured public identifiers and natural keys to create the approved initial data exactly once. Repeated execution must not duplicate or rewrite Users, memberships, roles, Store assignments, passwords, PINs, tenant settings, posted transactions, ledger entries, or balances.

The seeder runs inside database transactions and posts operational records through the same domain actions as the application. Every seeded transaction has a stable idempotency key. A failed tenant seed rolls back that tenant completely.

Bootstrap passwords and PINs are never hard-coded. When an initial identity does not exist, its secret is read from server environment configuration. Production execution rejects missing, weak, or known default secrets such as `password`; subsequent runs never overwrite an existing password or PIN. Secrets are never printed or stored in audit metadata.

It creates:

**Platform**

- `admin@example.com` as the initial Platform Admin when configured, without replacing an existing password, role, permissions, or 2FA state.

**Indonesia Business**

- `test@example.com` as Owner, preserving any existing account and credentials;
- `genta@xsisten.com` as Business Admin when configured, preserving any existing account and higher platform authority;
- one Manager with a full account;
- two Cashiers, including at least one POS-only membership;
- one Indonesia Store using IDR and an Indonesian timezone;
- one Register and representative open/closed sessions;
- Cash, QRIS, Bank, and enabled Shopee/Tokopedia clearing accounts;
- realistic products, variants, units, inventory, suppliers, purchases, customer Sales, returns, expenses, and one closing variance;
- one pending and one posted marketplace Settlement.

**Malaysia Business**

- a separate configured Malaysian initial Owner;
- one Manager and two Cashiers, including at least one POS-only membership;
- one Malaysia Store using MYR and a Malaysian timezone;
- one Register and representative open/closed sessions;
- Cash, DuitNow QR, Touch 'n Go, Bank, and enabled Shopee/Lazada clearing accounts;
- equivalent localized operational data and marketplace settlement examples.

If backfill already placed `test@example.com` or `genta@xsisten.com` in a Business, the seeder validates that relationship and never moves or duplicates it. A conflict fails with an actionable diagnostic instead of guessing. Initial account configuration is explicit and is not used by the general migration backfill.

Seeded operational records are ordinary tenant records and remain visible in production. Their stable keys and idempotency values make reruns no-ops; user edits after first creation remain authoritative.

### 16.3 Factories

Factories remain small and composable. They provide explicit states for Business Owner, Business Admin, Store Manager, Cashier with account, POS-only Cashier, Store country, active device, open Register Session, and marketplace clearing/settlement. Tests do not load the complete initial dataset when a small factory graph proves the behavior.

## 17. Error handling

All failures return direct, actionable localized messages.

Required failure cases include:

- inactive/suspended Business, Store, membership, or device;
- staff not assigned to the Store;
- wrong or temporarily locked PIN;
- no open Register Session;
- second session attempted on one Register;
- cash account does not match Register;
- approval actor lacks capability;
- country-incompatible or Store-disabled payment/marketplace;
- duplicate external marketplace order;
- currency mismatch;
- Settlement arithmetic mismatch or over-allocation;
- Store country/currency mutation after posting;
- plan Store/member/scan limit exceeded;
- backfill ambiguity or failed reconciliation.

Server-side authorization and validation remain authoritative. The frontend may anticipate a state but cannot bypass it.

## 18. Testing and acceptance criteria

### 18.1 Tenancy and authorization

- A User can own or join multiple Businesses without cross-tenant leakage.
- Every operational route rejects a Business Membership from another Business or Store.
- Platform permissions do not grant tenant authority.
- Owner, Admin, Manager, and Cashier capability matrices are covered route-by-route for changed surfaces.
- Cashier cannot read costs, global cash balances, purchasing, expenses, reports, subscription, team management, or other Cashiers' activity.
- Navigation matches server capabilities but backend denial tests remain authoritative.

### 18.2 POS identity and Register

- Owner creates POS-only Cashier, assigns Store, resets PIN, suspends, and reactivates safely.
- Activated device can unlock only assigned active Store staff.
- PIN fails on an unactivated/revoked device and is rate-limited.
- Entering terminal mode removes retained back-office authority.
- Concurrent session-open attempts produce one open session.
- Expected cash, counted cash, variance, refunds, and drawer movements reconcile exactly.
- Every new in-store Sale records membership, cashier snapshot, device/Register context, and open session.
- Manager approvals are attributable and cannot be replayed for another action.

### 18.3 Multi-country, payment, and marketplace

- Each supported locale contains every new UI key.
- User language remains independent from Store country.
- Store payment and marketplace choices are country- and Store-filtered on server and client.
- Tampered country/provider/payment IDs are rejected.
- Document currencies are server-derived and immutable.
- Unlike currencies are never summed.
- Duplicate marketplace order number is rejected under concurrency.
- Settlement allocation, fees, net transfer, reversal, and idempotent retry preserve clearing and destination balances.

### 18.4 Migration and seeding

- Legacy fixture backfill preserves row counts and aggregate balances.
- Existing Owner/Admin/Cashier mappings produce the specified new roles.
- Unknown or inconsistent legacy data fails with a diagnostic.
- Reference and initial-business seeders are idempotent in every environment.
- Production execution succeeds with valid bootstrap configuration, rejects missing/weak first-run secrets, and never replaces existing credentials or tenant data.
- Existing named accounts are preserved according to section 16.2.

### 18.5 Responsive webview and quality gates

- New UI is usable at 320, 375, 640, 768, 1024, 1280, and 1536 px.
- No horizontal page overflow, clipped primary action, inaccessible virtual-keyboard state, hover-only action, or sub-44 px primary touch control.
- Customer shell and established components/tokens are reused.
- Frontend unit tests, TypeScript, ESLint, Prettier, localization audit, production build, relevant PHPUnit tests, parallel suite, and project CI checks pass.
- Migration runs cleanly against an isolated test database and backfill reconciliation is verified.
- Final diff contains no hard-coded internal URLs, untranslated interface copy, duplicate authorization maps, compatibility fallback, unused abstraction, or unrelated redesign.

## 19. Rollout checkpoints

Implementation is split into reviewable checkpoints while preserving one final canonical model:

1. **Business foundation:** schema, models, Current Business context, deterministic backfill, subscription/entitlement ownership, and isolation tests.
2. **Membership and authorization:** actor migration, role/capability policies, Store assignments, invitation/claim flow, and role-aware navigation.
3. **POS terminal operations:** device activation, PIN session, Registers, sessions, drawer movements, approvals, Sale attribution, and owner team activity.
4. **Country commerce reference:** database-backed payment/marketplace catalogs, Store enablement, Super Admin management, snapshots, and legacy mapping.
5. **Marketplace settlement:** clearing account type, manual settlement/reversal, reconciliation, reports, and audit.
6. **Responsive UI and initial data:** customer/platform surfaces, all translations, deterministic production-safe Indonesia/Malaysia businesses, and webview verification.
7. **Cutover cleanup:** remove superseded owner/User actor paths, update canonical documentation, run full quality gates, and verify no stale compatibility code remains.

No checkpoint leaves a permanent dual source of truth. Temporary nullable columns exist only until the validated cleanup checkpoint.

## 20. Simplicity and maintainability review

This design intentionally rejects the following unnecessary abstractions:

- no generic Organization/Workspace/Company hierarchy in addition to Business;
- no Business country when country belongs to Store;
- no duplicate `business_id` on every Store-scoped operational table;
- no editable tenant permission graph before custom roles exist;
- no separate identity table for every staff type;
- no queryable PIN fingerprint or device fingerprinting;
- no separate application for cashier, owner, supplier, or each country;
- no country-specific controllers or schemas;
- no automatic FX, marketplace API framework, event bus, or microservice boundary;
- no rewrite of correct Sale, inventory, cash, purchase, return, and reporting calculations.

The new abstractions pass the project abstraction test:

- Business is the stable tenancy, billing, entitlement, and future referral boundary.
- Business Membership is the stable tenant actor and optional-login staff boundary.
- POS Device and Register Session are security and cash-accountability boundaries.
- Payment/Marketplace catalogs are mutable country reference-data boundaries administered by the platform.
- Marketplace Settlement is an immutable financial workflow with atomic ledger consequences.

All other behavior remains in existing domain-oriented policies, requests, actions, services, controllers, and Inertia pages.
