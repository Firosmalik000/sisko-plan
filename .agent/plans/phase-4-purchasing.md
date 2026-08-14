# Phase 4 - Purchasing dan Utang Supplier

## Status

Completed

## Goal

Membangun purchase dan supplier-payable ledger yang terintegrasi atomik dengan inventory serta cash ledger Phase 3.

## Repository State

- Phase 0 sampai Phase 3 selesai di working tree dan belum di-commit.
- Products/product units, suppliers, financial accounts, inventory/cash ledgers, idempotency, audit, dan document sequence tersedia.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase brief and phase registry
- [x] Product scope and business rules
- [x] Architecture and database standards
- [x] Security and tenancy
- [x] Testing and UI/UX standards
- [x] Existing Phase 2 and Phase 3 code/tests

## Scope

- Posted purchase with item snapshots and landed-cost allocation.
- Cash, partial, and credit settlement.
- Supplier payable projection and immutable history.
- Additional payments with overpayment protection.
- Purchasing UI, history, and debt summary.

## Out of Scope

- Purchase orders, separate receiving, returns, cancellation/reversal, attachments, and formal aging.

## Business Rules

- Purchase total is server-derived from item subtotal, discount, and additional cost.
- Inventory receives base quantity and allocated landed base-unit cost.
- Supplier payable increases by purchase total and decreases only through posted payment.
- Cash decreases through the selected financial account for every payment.
- Payment cannot exceed purchase outstanding or account cash balance.
- Posted documents and ledgers are immutable.

## Architecture Decisions

- Reuse Phase 3 stock, cash, sequence, timestamp, audit, and idempotency engines.
- Add a payable ledger plus lockable supplier projection.
- Lock purchase row before deriving outstanding from immutable payments.
- Keep paid/outstanding/status derived rather than mutating the purchase header.

## Transaction and Concurrency Strategy

- Lock product inventory projections through `ApplyStockMovement`.
- Lock financial account balances through `ApplyCashTransaction`.
- Lock supplier payable projection before every payable movement.
- Lock purchase before checking and posting subsequent payment.
- Persist purchase, items, payments, all ledgers, projections, and audit in one transaction.

## Testing Strategy

- Cover cash/partial/credit purchase, unit conversion, landed cost, payment, overpayment, insufficient cash, idempotency, rollback, backdating, and cross-store references.

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

- 2026-08-07: Audited Phase 3 ledgers and all canonical product, database, security, testing, and UI standards.
- 2026-08-07: Reconstructed canonical Phase 4 because root `PHASE-4.md` contains the Phase 5 POS brief.
- 2026-08-07: Added immutable purchase/payment documents, item snapshots, and supplier payable ledger/projection.
- 2026-08-07: Integrated purchase posting with stock moving average, cash settlement, payable movements, audit, and idempotency.
- 2026-08-07: Added tenant-scoped purchasing UI, histories, supplier balances, and payment workflow.
- 2026-08-07: Added nine Phase 4 feature tests and completed full regression and production build.
- 2026-08-07: Review fixes added derived-decimal guards, deterministic lock ordering, duplicate-invoice validation, payment form reset, and five regression scenarios.

## Discoveries and Deviations

- Purchase return/reversal is deferred because posted inventory and payable corrections require a dedicated controlled reversal workflow.
- Paid amount, outstanding amount, and payment status remain derived from immutable payments rather than mutable purchase columns.

## Commands Executed

- `vendor/bin/pint --dirty`
- `php -d memory_limit=512M vendor/bin/phpstan analyse --no-progress --memory-limit=512M`
- `php artisan test tests/Feature/PurchasingTest.php`
- `php artisan test`
- `npm run lint:check`
- `npm run format:check`
- `npm run types:check`
- `npm run build`
- `php artisan migrate --force`

## Verification Results

- Purchasing tests: 14 passed, 77 assertions.
- Full test suite: 103 passed, 457 assertions.
- PHPStan: passed with zero errors.
- Pint, ESLint, Prettier, TypeScript: passed.
- Vite production build: passed.
- Purchasing migration: applied successfully.

## Remaining Risks and Limitations

- Purchase return, controlled cancellation/reversal, supplier credit notes, attachments, and formal aging remain intentionally out of scope.
- Browser interaction was not exercised with a real signed-in session; HTTP/Inertia authorization and payload contracts are covered by feature tests.

## Completion Summary

Phase 4 is complete. Stores can post cash, partial, or credit purchases with unit conversion and landed-cost moving average, monitor supplier payable balances, and post protected follow-up payments.
