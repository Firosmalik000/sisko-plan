# Phase 5 - POS, Sales, COGS, Profit, and Returns

## Status

Completed

## Goal

Deliver a real Stage 1 POS whose sale and return workflows reconcile inventory, cash, COGS, and gross profit.

## Repository State

- Phase 1 through Phase 4 are complete in the working tree and remain uncommitted.
- Tenant context, master data, inventory/cash ledgers, audit, idempotency, timestamps, and document sequencing are available.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase registry and reconstructed Phase 5 brief
- [x] Product scope and business rules
- [x] Architecture and database standards
- [x] Security and tenancy
- [x] Testing and UI/UX standards
- [x] Existing purchasing and operational ledger code/tests

## Scope

- Cash POS sale, item snapshots, payment, inventory out, COGS, and profit.
- Product/barcode cart UI, history, detail, and printable receipt.
- Partial/full return, refund, inventory restoration, and reversal metrics.

## Architecture Decisions

- Derive sale header revenue totals server-side and store COGS/profit snapshots per item.
- Use one payment account per Stage 1 sale; cash movement equals sale total while tendered/change remain receipt data.
- Serialize returns by locking the original sale.
- Reuse stock/cash ledger actions with deterministic stock-before-cash lock order.
- Never mutate a posted sale; a full return is controlled cancellation.

## Transaction and Concurrency Strategy

- Sort product locks by product/product-unit ID.
- Lock inventory projections before the financial account for sale and return.
- Lock the sale before calculating cumulative returned quantity.
- Keep document, items, payment/refund, ledgers, projections, and audit in one transaction.

## Testing Strategy

- Cover cash sale, multiple items, conversion, discounts, HPP/profit, paid/change, insufficient stock, idempotency, tenancy, authorization, rollback, backdating, partial/full/excess return, refund cash failure, immutability, pagination, and receipt.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and migrations
- [x] Backend domain
- [x] Authorization and validation
- [x] Frontend
- [x] Automated tests
- [x] Verification
- [x] Diff review
- [x] Documentation
- [x] Completion report

## Progress Log

- 2026-08-07: Audited Phase 1-4 domain, ledgers, policies, standards, and tests.
- 2026-08-07: Reconstructed canonical Phase 5 because root `PHASE-5.md` contained a shifted Phase 7 brief.
- 2026-08-07: Added immutable sale, item, payment, return, and return-item records.
- 2026-08-07: Integrated stock-out, cash receipt, actual movement COGS, gross profit, refund, and stock-cost restoration.
- 2026-08-07: Added responsive barcode POS, paginated history, protected profit data, printable receipt, and return workflow.
- 2026-08-07: Added 16 Phase 5 feature tests and completed full regression/static/build verification.
- 2026-08-08: Fixed final fractional-return reconciliation by restoring the exact remaining base quantity.
- 2026-08-08: Removed return COGS/profit fields from cashier payloads and added localized Phase 5 ledger labels.
- 2026-08-08: Added regression coverage for fractional return rounding and cashier return-profit isolation.

## Discoveries and Deviations

- Split payment and customer credit are deferred to keep Stage 1 settlement and return reconciliation explicit.
- Barcode resolves to the base unit when a product has multiple sale units.
- Cashiers can post sales and view receipts but owner/admin authorization is required for refunds.

## Commands Executed

- `vendor/bin/pint --dirty`
- `php -d memory_limit=512M vendor/bin/phpstan analyse --no-progress --memory-limit=512M`
- `php artisan test tests/Feature/SalesPosTest.php`
- `php artisan test`
- `npm run lint:check`
- `npm run format:check`
- `npm run types:check`
- `npm run build`
- `php artisan migrate --force`
- `vendor/bin/pint --dirty`
- `php -d memory_limit=512M vendor/bin/phpstan analyse --no-progress --memory-limit=512M`
- `php artisan test tests/Feature/SalesPosTest.php`
- `php artisan test`
- `npm run lint:check`
- `npm run format:check`
- `npm run types:check`
- `npm run build`

## Verification Results

- Phase 5 tests: 17 passed, 119 assertions.
- Full suite: 120 passed, 576 assertions.
- PHPStan: passed with zero errors.
- Pint, ESLint, Prettier, and TypeScript: passed.
- Vite production build: passed.
- Sales migration: applied successfully.

## Remaining Risks and Limitations

- Customer credit, split payment, shifts, offline mode, and exchange documents remain intentionally out of scope.
- A real signed-in browser session and physical barcode scanner/receipt printer were not exercised; HTTP/Inertia contracts, responsive build, barcode selection logic, and printable markup are covered by automated/static verification.

## Completion Summary

Phase 5 is complete and review fixes are verified. Stores can sell through a fast POS, reconcile stock/cash/COGS/gross profit, print receipts, and process partial or full controlled returns with exact cumulative quantity, value, and authorization boundaries.
