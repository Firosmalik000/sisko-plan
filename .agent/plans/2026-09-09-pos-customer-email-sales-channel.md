# POS customer email, sales channel, and payment methods — ExecPlan

## Status

Implementation complete; authenticated interactive browser checkout QA remains unavailable because the available browser session stops at login.

## Goal

Extend POS customer capture with email and separate the sales channel from the payment method so direct and marketplace sales remain easy to enter and financially traceable.

## Repository State

The working tree contains existing user changes, including completed POS scanner and sales-filter work. Preserve all unrelated edits and extend the current POS/sales contracts in place.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active Phase 5 documents
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing POS, customer, payment-proof, and sales-filter tests

## Dependencies and Prerequisites

- Existing store-scoped customer identity by normalized phone.
- Existing single-account sale settlement and cash ledger.
- Existing private payment-proof storage.

## Scope

- Optional customer email stored on the reusable customer and immutable sale snapshot.
- Direct-store and marketplace sales channels.
- Country-scoped marketplace choices and external order reference.
- Cash, QRIS, bank transfer, e-wallet, and marketplace balance payment classifications.
- Marketplace clearing account created lazily and uniquely per store/provider.
- Sales history/detail search and presentation for the new fields.
- Localized, compact, responsive POS controls.

## Out of Scope

- Loyalty point earning/redemption.
- Marketplace API integrations, order synchronization, payout reconciliation, and automatic platform-fee calculation.
- Split payments or customer credit.

## Business Rules

- Phone remains the store-scoped reusable customer identity; email is optional and is not unique.
- A supplied email requires the customer name and phone pair.
- Marketplace is a sales channel, not a direct payment rail.
- Each sale remains fully settled into exactly one financial account.
- Marketplace gross proceeds enter a provider-specific clearing account; later payout is an account transfer and platform fees are recorded separately as expenses.

## Architecture Decisions

- Keep country/provider configuration server-owned in `config/sales.php` and pass only the active store choices to Inertia.
- Keep the existing `PostSale` action and append compatible optional arguments.
- Submit an explicit payment method and validate it against the selected account type.
- Resolve marketplace clearing accounts through a dedicated action before posting the sale.

## Database Changes

- Add nullable `customers.email` and `sales.customer_email`.
- Add `sales.sales_channel`, nullable `marketplace_code`, and nullable `external_order_number`.
- Add nullable `financial_accounts.marketplace_code` with a store/provider unique constraint.
- Expand `sale_payments.payment_method` capacity if required.
- Backfill existing sales to the direct-store channel; do not rebuild or truncate data.

## Backend Changes

- Normalize/validate the expanded request contract.
- Preserve email and channel fields in the idempotency hash and sale snapshot.
- Validate store ownership and payment/account compatibility.
- Extend sales search/filter/detail props.

## Frontend Changes

- Add email to the collapsed customer card.
- Keep Cash and QRIS primary; place bank/e-wallet choices under a compact “other payments” disclosure.
- Add a compact channel selector; reveal marketplace/provider/order fields only when needed.
- Show channel, marketplace, order reference, and email in sales history/detail.

## UI/UX Implementation Rules

- Preserve the existing theme and cashier-first hierarchy.
- Avoid explanatory paragraphs; use conditional labels and concise status.
- Keep primary checkout actions visible and controls at least 44px high.

### Responsive Verification

- [ ] `xs` — 320px
- [ ] `sx` — 375px
- [ ] `sm` — 640px
- [ ] `md` — 768px
- [ ] `lg` — 1024px
- [ ] `xl` — 1280px
- [ ] `2xl` — 1536px

## Security and Tenancy Review

- Resolve all accounts and marketplace clearing records within the active store.
- Keep proof downloads on the existing authorized private route.
- Reject provider/account combinations that do not belong to the active store configuration.

## Transaction and Concurrency Strategy

- Create marketplace clearing accounts under a store row lock with a database uniqueness guarantee.
- Keep sale, stock, payment, cash-ledger, and audit writes in the existing atomic transaction.
- Preserve idempotency across all new user-controlled fields.

## Testing Strategy

- Migration up/down against an isolated test database plus local in-place migrate.
- Feature tests for email persistence/snapshots, validation, direct payment types, marketplace account reuse, tenancy, idempotency, search, and filters.
- Focused Laravel tests, formatting, lint, types, i18n audit, build, and local browser QA.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and migrations
- [x] Backend domain
- [x] Authorization and validation
- [x] Frontend
- [ ] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [x] Interface copy review
- [x] Automated tests
- [x] Verification
- [x] Diff review
- [x] Documentation
- [x] Completion report

## Progress Log

- 2026-09-09: Audited the existing POS, customer identity, payment account, ledger, sales history, tenancy, and migration contracts.
- 2026-09-09: Added additive schema, email snapshots, channel/payment validation, marketplace clearing accounts, country-specific QR methods, Touch 'n Go for Malaysia, and branded marketplace/payment marks.
- 2026-09-09: Hardened server-side QR/wallet compatibility so a Touch 'n Go account cannot be submitted as DuitNow QR, while preserving legacy untagged non-cash accounts.
- 2026-09-09: Applied the additive migrations locally; existing sales were backfilled to `in_store` by the schema default without refreshing data.
- 2026-09-09: Diagnosed the Malaysia checkout report against live local session/account state. Removed native browser validation ambiguity, cleared stale payment/channel errors on selection changes, and surfaced the first actionable server validation message.
- 2026-09-09: Reproduced Thailand PromptPay checkout failure caused by the POS form carrying its default marketplace code into an `in_store` request. Cleared dormant marketplace state in the client and normalized irrelevant marketplace fields at the request boundary.
- 2026-09-09: Hardened the country-payment matrix in one shared catalog. POS now hides foreign country-specific wallets, request/action validation share the same compatibility decision, and QRIS, DuitNow QR, PromptPay QR, and VietQR are each accepted only for their configured country/method pair.
- 2026-09-09: Expanded verification after user review with a Cartesian country/account/method test, country-scoped marketplace tests, and a read-only audit of every local store payment account. The live Thailand store contains only Cash and `promptpay_qr`; no foreign payment code is attached to it.
- 2026-09-10: A deeper live-data audit found one Indonesian legacy QRIS account with a null payment code, making it ambiguously acceptable as QRIS and e-wallet. Added and applied a non-destructive country-aware backfill, removed null-code QR compatibility, then reran the live matrix with zero violations.
- 2026-09-10: Added explicit catalog uniqueness, pre-transaction country-switch reconciliation, and legacy backfill regression tests. Confirmed the payment migration is applied, configuration is not stale-cached, and recent runtime logs contain no PromptPay/payment-code validation error.
- 2026-09-10: Fixed stale POS checkout timestamps exposed by the Vietnam/VietQR flow. POS refreshes its store-local timestamp at submit time, while the server safely aligns immediate POS sales with the latest affected stock/account ledger timestamp without weakening chronology checks for other posting workflows.

## Discoveries and Deviations

- Existing non-cash accounts are currently all persisted as `qris`; this change must submit and validate the actual payment rail.
- Marketplace fees and payouts are separate workflows, so POS will record gross proceeds into a clearing account without pretending the bank has already received them.
- QR labels are country-specific: QRIS (Indonesia), DuitNow QR (Malaysia), PromptPay QR (Thailand), and VietQR (Vietnam). TapCash remains an Indonesian account option rather than a Malaysian alias.

## Commands Executed

- `git status --short --branch`
- Repository and skill documentation inspection commands.
- `php artisan migrate --force`
- `php artisan test tests/Feature/SalesPosTest.php --stop-on-failure`
- `npx tsc --noEmit --pretty false`
- Scoped ESLint and Prettier commands.
- `php artisan test --filter=SalesPosTest`
- `php artisan test`
- Focused PHPStan analysis for the changed sales/payment backend.
- `node build/audit-i18n.cjs`
- `git diff --check`

## Verification Results

- Focused sales/POS regression: 40 tests, 802 assertions passed after strict legacy cleanup.
- Thailand PromptPay reproducer failed before the fix with `marketplace code tidak diizinkan.`; the expanded four-country QR transaction matrix passed with 92 assertions.
- Cartesian compatibility matrix passed 144 assertions across every configured QR account, all five in-store payment methods, all four countries, Touch 'n Go, Cash, and marketplace-account isolation.
- Country-scoped marketplace matrix passed 32 assertions for allowed and foreign provider pairs.
- Cross-country regression proved a Malaysian Touch 'n Go account no longer appears or posts in a Thailand POS.
- Final full Laravel run: 309 of 310 tests passed with 3,273 assertions. The sole failure is `MasterDataTest::test_editing_shared_variant_hpp_revalues_existing_stock_without_changing_quantity`; it also fails in isolation due to catalog-intelligence HTTP failure/product duplicate validation and does not touch sales, payments, countries, or the changed files.
- TypeScript: passed.
- Scoped ESLint: passed.
- Scoped Prettier: passed.
- Focused PHPStan: 0 errors, including the shared country/payment compatibility catalog.
- Read-only live database audit confirmed: Indonesia uses QRIS, Malaysia uses DuitNow QR plus Touch 'n Go, Vietnam uses VietQR, and Thailand uses PromptPay QR. No live store had a country-specific payment code from another country.
- Post-backfill live compatibility audit returned zero violations; every coded account is accepted as exactly one intended method, and marketplace accounts are accepted as no in-store method.
- Vietnam stale-page regression passed with the sale, stock movement, and VietQR payment sharing the latest safe ledger timestamp; the full Sales/POS suite passed 41 tests and 807 assertions.
- i18n audit: 2,451 covered UI literal occurrences with Malay, English, and Vietnamese output coverage.
- Production build: passed; only the existing large-chunk/optional Fontaine warnings remain.
- Local migrations applied successfully; 4 existing sales had no missing `sales_channel` after backfill.
- `git diff --check`: passed.

## Remaining Risks and Limitations

- Authenticated interactive checkout could not be repeated in the in-app browser because the available session redirected to login. The exact browser payload contract was reproduced through the HTTP feature test, but this is not a substitute for a signed-in visual checkout run.
- One unrelated Master Data test remains red because its external catalog-intelligence request fails even when run alone. Payment verification is green, but the repository-wide suite cannot honestly be reported as completely green until that independent test is repaired or its external dependency is made deterministic.
- Brand marks are compact in-app identifiers rather than downloaded trademark artwork, avoiding an additional asset/network dependency.

## Completion Summary

POS now captures optional customer email, separates sales channel from payment rail, supports country-aware marketplaces and QR methods, exposes Touch 'n Go for Malaysian stores, routes marketplace proceeds into store/provider clearing accounts, and surfaces the new information in sales history. Validation, idempotency, tenancy, and financial-account compatibility are enforced server-side and covered by regression tests.
