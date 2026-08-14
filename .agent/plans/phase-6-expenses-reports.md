# Phase 6 - Expenses, Dashboard, and Reports

## Status

Completed

## Goal

Deliver traceable store expenses and simple, correct operational reporting that helps owners understand current business position and estimated operating performance.

## Repository State

- Phase 1 through Phase 5 are complete in the working tree and remain uncommitted.
- Inventory, cash, supplier payable, sales, return, COGS, and gross-profit ledgers are available.
- Root `PHASE-6.md` contains a shifted testing standard, so the canonical brief is reconstructed in `docs/phases/PHASE-6.md`.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase registry and reconstructed Phase 6 brief
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing dashboard, operational ledger, purchasing, and sales tests

## Dependencies and Prerequisites

- Active-store middleware and owner/admin/cashier roles.
- Financial accounts, cash ledger, and balance projection.
- Inventory balances, supplier payable balances, sales, returns, and cost snapshots.
- Audit, idempotency, timestamp normalization, and document sequencing actions.

## Scope

- Expense category maintenance and immutable expense posting.
- Expense cash-out, audit, idempotency, pagination, and tenant authorization.
- Store-aware dashboard with position and month-to-date performance metrics.
- Date-filtered operational report with summary, daily trend, and product performance.

## Out of Scope

- Full accounting, tax, payroll, budgets, accruals, attachments, formal exports, and report scheduling.

## Business Rules

- Expense amount and business metrics are authoritative server-side decimals.
- Net revenue and COGS subtract returns based on return posting date.
- Estimated operating profit equals net gross profit less posted expenses.
- Position metrics use current ledger projections and are not period balances.
- Only owner/admin members can manage or view expenses and profitability reports.

## Architecture Decisions

- Keep expense posting in a dedicated transaction action that reuses cash, sequence, timestamp, idempotency, and audit services.
- Store expense category/name snapshots on posted expense documents.
- Build dashboard and reports from existing immutable documents and projections without introducing a reporting snapshot table.
- Aggregate report queries by active store and bounded UTC date range derived from the store timezone.

## Database Changes

- Add `expense_categories` with store-scoped unique names and active status.
- Add immutable `expenses` with public/document IDs, category/account references and snapshots, amount, idempotency hash, timestamps, actor, and indexes.

## Backend Changes

- Expense models, requests, posting action, controller, reporting service/controller, routes, and policy abilities.
- Replace static dashboard route with an authorized data controller.

## Frontend Changes

- Expense category/posting/history page.
- Data-driven dashboard with clear operational language and low-stock list.
- Date-filtered report page with summary, daily trend, product table, and position cards.
- Sidebar navigation and localized cash reason.

## Security and Tenancy Review

- Scope every query and submitted relationship to `CurrentStore`.
- Restrict expense and report routes to owner/admin.
- Never serialize expense, COGS, or profit values to cashiers.
- Test cross-store category/account denial and report isolation.

## Transaction and Concurrency Strategy

- Lock the selected financial account through the existing cash action.
- Generate expense document numbers under the existing sequence row lock.
- Persist expense, cash transaction, balance projection, and audit in one database transaction.
- Bind idempotency keys to a canonical request hash and recover unique-key races.

## Testing Strategy

- Test successful expense reconciliation, insufficient balance rollback, audit rollback, idempotency, immutability, cross-store denial, role authorization, pagination, dashboard formulas, report formulas/date filtering, and report isolation.
- Run focused tests, full suite, formatter, static analysis, frontend lint/format/type checks, build, and migration status.

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

- 2026-08-08: Audited Phase 1-5 ledgers, tenancy, authorization, dashboard, UI standards, and tests.
- 2026-08-08: Reconstructed canonical Phase 6 because root `PHASE-6.md` contains a shifted testing document.
- 2026-08-08: Added expense categories and atomic immutable expense posting with cash, audit, idempotency, and tenant controls.
- 2026-08-08: Replaced the placeholder dashboard with current-position and month-to-date operational metrics.
- 2026-08-08: Added date-filtered performance, daily trend, and product reports with owner/admin-only cost visibility.
- 2026-08-08: Added eight Phase 6 feature tests and completed full regression, static, frontend, build, and migration verification.

## Discoveries and Deviations

- No formal Phase 6 brief existed; scope was derived from the product outcomes, database standards, UI language, and phase registry.
- Formal accounting reports remain intentionally out of scope.
- Daily report buckets are streamed and assigned in the store timezone so UTC day boundaries do not distort local results.
- Report periods are limited to 366 inclusive calendar days to bound interactive report work.

## Commands Executed

- `vendor/bin/pint --dirty`
- `php -d memory_limit=512M vendor/bin/phpstan analyse --no-progress --memory-limit=512M`
- `php artisan test tests/Feature/ExpensesReportsTest.php`
- `php artisan test`
- `php artisan route:list --path=dashboard`
- `php artisan route:list --path=expenses`
- `php artisan about --only=environment`
- `php artisan migrate:status`
- `php artisan migrate --force`
- `npm run format`
- `npm run lint:check`
- `npm run format:check`
- `npm run types:check`
- `npm run build`

## Verification Results

- Phase 6 tests: 8 passed, 129 assertions.
- Full suite: 128 passed, 705 assertions.
- PHPStan: passed with zero errors.
- Pint, ESLint, Prettier, and TypeScript: passed.
- Vite production build: passed.
- Expense migration: applied locally as batch 10.

## Remaining Risks and Limitations

- Reports are operational estimates, not audited accounting statements.
- Formal exports, accruals, reversals, tax, payroll, budgets, and scheduled reports remain out of scope.
- A real signed-in browser session was not exercised; HTTP/Inertia contracts, responsive markup, type checks, and production build were verified.

## Completion Summary

Phase 6 is complete. Owners and admins can post traceable store expenses, understand current cash/inventory/payable position, and inspect date-filtered revenue, COGS, gross profit, expenses, estimated operating profit, daily trends, and product performance without exposing sensitive cost data to cashiers.
