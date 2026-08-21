# POS Product, Variant, and Payment Flow

## Status

In Progress

## Goal

Make the POS show one catalog card per product, ask for a variant only when needed, return to the product list after selection, simplify payment to Cash or QRIS, and improve the cart hierarchy and controls.

## Repository State

The Laravel/Inertia POS currently renders one card per active `product_unit`, so variant child products appear as a flat repeated list. Sales are posted through `PostSale` and retain a store-scoped `financial_account_id`. Product variants are child `products` linked through `parent_product_id`; shared-stock variants use `stock_product_id`. The worktree contains unrelated in-progress changes, including the variant domain, which must be preserved.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Follow-up task scope (this ExecPlan)
- [x] Business rules / ExecPlan standard
- [x] Architecture / security guidance
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] `tests/Feature/SalesPosTest.php`

## Dependencies and Prerequisites

- Existing active product, unit, inventory, and financial-account records.
- Existing variant migration and `SaveProduct` behavior.

## Scope

- POS catalog grouping and variant selection.
- Cart item visual hierarchy and responsive controls.
- Cash/QRIS payment-method presentation backed by existing financial accounts.
- POS controller projection and focused feature coverage.

## Out of Scope

- Replacing the financial ledger/account model.
- Changing historical sale or payment records.
- Redesigning sales history and return workflows.

## Business Rules

- A product appears once in the catalog.
- A single-option product is added immediately.
- A multi-option product opens a concise variant chooser; choosing an option closes it and restores catalog search focus.
- Cash may accept a tendered amount and calculate change.
- QRIS must post the exact sale total and therefore has no cash change.
- The server remains authoritative for stock, price, totals, and tenant-scoped IDs.

## Architecture Decisions

- Keep the posted `account_id` contract and ledger model unchanged.
- Project catalog parent identity and variant label in `PosController`, then group rows in the React page.
- Present at most two cashier-facing payment methods: the first active cash account as Cash, and a QRIS-named/e-wallet/bank account as QRIS.

## Database Changes

- Add `sale_payments.payment_method` as a compact immutable `cash` / `qris` snapshot.
- Backfill existing non-cash sale payments as QRIS while retaining `financial_account_id` for ledger attribution.

## Backend Changes

- Add catalog parent identity and variant metadata to the POS product projection.
- Replace the raw account list prop with cashier-facing payment-method options.
- Snapshot Cash/QRIS on each posted sale payment.
- Keep store-scoped validation and account resolution unchanged.

## Frontend Changes

- Group product-unit rows into product cards.
- Add an accessible variant-selection dialog.
- Redesign compact cart rows with clearer variant, unit price, line total, quantity, and discount controls.
- Use Cash/QRIS segmented controls and method-specific tender behavior.
- Separate manual product entry and barcode scanning into explicit tabs while preserving keyboard focus after each add.

## UI/UX Implementation Rules

- Keep copy concise and task-oriented.
- Maintain 44px minimum primary touch targets.
- Avoid horizontal overflow at 320px through 1536px.
- Preserve search-first and barcode-first cashier behavior.

## Security and Tenancy Review

All products, units, and accounts remain selected from active-store queries. Posted IDs continue through existing store-scoped request validation and controller lookups.

## Transaction and Concurrency Strategy

No change. `PostSale` retains its transaction, locking, stock checks, total recalculation, and idempotency behavior.

## Testing Strategy

- Extend the POS Inertia feature assertion for grouped-catalog metadata and Cash/QRIS methods.
- Run the focused PHP feature test.
- Run TypeScript, lint, formatting, and production build checks.
- Inspect and exercise the local POS at xs, sx, sm, md, lg, xl, and 2xl widths.

## Implementation Milestones

- [x] Repository audit
- [x] Backend projection
- [x] Frontend catalog and cart
- [x] Payment-method flow
- [x] Automated tests
- [ ] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [x] Interface copy review
- [x] Diff review
- [ ] Completion report

## Progress Log

- 2026-08-19: Audited POS controller/page, variant persistence, sale action, request validation, relevant tests, and repository standards.
- 2026-08-19: Implemented parent-product catalog grouping, variant dialog, compact cart rows, and Cash/QRIS controls.
- 2026-08-19: Added immutable payment-method snapshots without replacing financial-account ledger attribution.
- 2026-08-19: Completed focused and full automated verification; visual browser QA reached the login screen but had no authenticated session.
- 2026-08-20: Split the combined product search/barcode field into compact drawer-style Input product and Scan barcode tabs, including missing-barcode and out-of-stock scan states.

## Discoveries and Deviations

- Variant options are stored as child products, not multiple units on the parent.
- The existing payment ledger requires a financial account; Cash/QRIS is therefore a cashier-facing simplification over store accounts, not a replacement for ledger attribution.
- A stored payment-method snapshot was added after diff review so reports can distinguish the cashier-selected method independently of account naming.

## Commands Executed

- Repository file discovery with `rg`.
- Required-document and relevant-code inspection with `Get-Content`.
- Worktree review with `git status` and focused `git diff`.
- Prettier, ESLint, TypeScript, Pint, Vite build, focused POS tests, and the full PHP test suite.
- Local browser navigation to `/pos` and authentication-state inspection.
- Local environment inspection and additive database migration.

## Verification Results

- Prettier: passed.
- ESLint on POS page: passed.
- TypeScript: passed.
- Vite production build: passed (optional `fontaine` notice only).
- Focused POS feature tests: 20 passed, 182 assertions.
- Full PHP suite: 164 passed, 1,105 assertions.
- Local migration `2026_08_19_000000_add_payment_method_to_sale_payments`: applied successfully.
- `git diff --check`: passed.
- Follow-up POS tab change: Prettier, focused ESLint, TypeScript, and `git diff --check` passed.
- Follow-up production build could not start Wayfinder generation because PHP is unavailable on the command PATH in this session.
- Follow-up visual QA could not start because the local in-app browser runtime rejected its configured trusted plugin path.
- Browser reached the local app successfully but redirected to login; authenticated responsive screenshots/interactions could not be completed.

## Remaining Risks and Limitations

- QRIS availability depends on an active QRIS, e-wallet, or bank account in the store.
- Visual checks at 320, 375, 640, 768, 1024, 1280, and 1536 remain pending until the browser has an authenticated local-app session.

## Completion Summary

Implementation and automated verification are complete. Authenticated responsive visual verification remains pending.
