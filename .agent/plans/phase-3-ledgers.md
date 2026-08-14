# Phase 3 - Stok, Kas, dan Modal

## Status

Completed on 2026-08-06

## Goal

Membangun ledger stok, kas, dan modal yang terisolasi per toko, immutable, decimal-safe, serta atomik.

## Repository State

- Phase 0 sampai Phase 2 selesai; perubahan sebelumnya masih berada di working tree.
- Produk, satuan, akun keuangan, active-store middleware, policy, dan audit log tersedia.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase file
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing relevant tests

## Dependencies and Prerequisites

- Store-scoped products and financial accounts from Phase 2.
- Active `CurrentStore`, membership roles, and audit logging from Phase 1.
- BCMath runtime extension for fixed-scale arithmetic.

## Scope

- Inventory balances, movements, adjustments, opening stock, damaged/lost stock.
- Financial account balances, opening cash, cash transactions, and transfers.
- Cash/inventory owner contributions and withdrawals with capital history.

## Out of Scope

- Purchases, POS, expenses, formal accounting journal, and reversals.

## Business Rules

- Stock, cash, and capital remain separate concepts and ledgers.
- Posted records are immutable; corrections require a future reversal workflow.
- Negative stock and cash are rejected while holding a row lock.
- Incoming inventory recalculates moving weighted average; outgoing inventory uses current average cost.
- Capital contribution/withdrawal affects capital and exactly one asset ledger atomically.

## Architecture Decisions

- Append-only ledger tables are the history source of truth; balance tables are lockable projections.
- All monetary and quantity math uses BCMath strings with database-compatible scales.
- Actions own transactions and lock projections; controllers only authorize, validate, and present.
- Public ULIDs are exposed to routes while integer keys remain internal.

## Database Changes

- Add inventory/account projections, stock/cash ledgers, adjustment/transfer/capital headers and items.
- Add document sequences and store-scoped idempotency constraints.

## Backend Changes

- Add posting engines and actions for adjustments, opening cash, transfer, and owner capital.
- Add scoped requests, controllers, policies, routes, and reconciliation queries.

## Frontend Changes

- Add responsive inventory, cash, and capital pages with posting forms and histories.

## Security and Tenancy Review

- Resolve products and accounts exclusively through the active store.
- Allow owner/admin to post and active members to view operational ledgers.
- Never accept `store_id`, derived cost, balance, or document number from clients.

## Transaction and Concurrency Strategy

- Lock/create each balance projection before computing a change.
- Allocate document numbers under a per-store/type/period sequence lock.
- Persist headers, items, ledgers, projections, and audit in one database transaction.

## Testing Strategy

- Cover openings, contribution/withdrawal, transfer conservation, adjustment, negative rejection, moving average, idempotency, rollback, and cross-store references.
- Recalculate ledger totals in tests and compare them with projections.

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

- 2026-08-06: Audited Phase 2 domain, tenancy, authorization, routes, UI, and test foundations.
- 2026-08-06: Confirmed BCMath availability and selected append-only ledgers with lockable projections.
- 2026-08-06: Added stock, cash, and capital documents, ledgers, projections, idempotency, and document sequences.
- 2026-08-06: Added owner/admin posting, active-member read access, tenant-scoped validation, and three responsive ledger pages.
- 2026-08-06: Added moving-average, negative-balance, transfer conservation, rollback, immutability, and cross-store tests.
- 2026-08-06: Applied the operational-ledger migration to local MySQL after shortening one vendor-limited index name.
- 2026-08-06: Fixed review findings covering full-depletion rounding, chronological posting, concurrent opening locks, payload-bound idempotency, store timezone handling, and paginated histories.
- 2026-08-06: Added request fingerprints through migration batch 7 and expanded Phase 3 regression coverage.

## Discoveries and Deviations

- Root `PHASE-1.md` contains the Phase 3 product brief; this canonical file resolves the naming mismatch.
- MySQL limits identifiers to 64 characters; the capital item composite index uses an explicit short name.
- Ledger projections are maintained in posting order, so backdated writes are rejected under the same projection lock rather than replaying immutable history.

## Commands Executed

- `php -r "echo extension_loaded('bcmath') ? 'yes' : 'no';"`
- `php artisan route:list --path=operations`
- `php artisan test tests/Feature/OperationalLedgerTest.php`
- `php artisan test`
- `php -d memory_limit=512M vendor/bin/phpstan analyse --no-progress`
- `php vendor/bin/pint --dirty --test`
- `npm run lint:check`
- `npm run format:check`
- `npm run types:check`
- `npm run build`
- `php artisan migrate --force`
- `php artisan migrate:status`
- `git diff --check`

## Verification Results

- Phase 3 feature suite: 18 tests passed with 77 assertions.
- Full PHPUnit suite: 89 tests passed with 380 assertions.
- PHPStan passed with zero errors using a 512 MB process memory limit.
- Pint, ESLint, Prettier, and TypeScript passed.
- Vite production build passed after transforming 3,365 modules.
- SQLite test migrations and local MySQL migrations through batch 7 passed.

## Remaining Risks and Limitations

- Explicit reversal and accounting journals are deferred to later phases.
- Authenticated browser smoke testing is not available without a persistent local test account/session.
- Lock ordering and unique-conflict recovery follow MySQL semantics, but the automated suite does not yet launch truly parallel database processes.

## Completion Summary

Phase 3 provides independently reconcilable stock, cash, and owner-capital histories with lockable balance projections. Opening balances, adjustments, transfers, contributions, and withdrawals are atomic, idempotent, tenant-scoped, decimal-safe, and immutable after posting.
