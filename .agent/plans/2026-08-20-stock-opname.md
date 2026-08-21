# Stock Opname — ExecPlan

## Status

Implemented

## Goal

Add a tenant-safe stock opname workflow that lets an owner/admin start an
opname, lets active store members record physical counts, and only lets an
owner/admin post the resulting stock corrections.

## Repository State

The repository already contains inventory balances, immutable stock movements,
stock adjustments, audit logs, store membership roles, and an Inertia/React
mobile-first customer workspace. The worktree contains unrelated in-progress
changes; this implementation must preserve them.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Phase 3 inventory requirements and Phase 8 hardening requirements
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing operational ledger tests

## Scope

- Stock opname sessions and item snapshots.
- Draft physical-count entry by active store members.
- Count completion by active store members.
- Owner/admin-only start, reopen, cancel, and posting.
- Atomic ledger corrections and audit history.
- Mobile-first list and counting UI consistent with Inventory.
- Search, progress, discrepancy summaries, and zero-count support.

## Out of Scope

- Warehouse/location-level counts.
- Offline synchronization.
- Blind counts and multi-counter assignment.
- Approval chains beyond owner/admin posting.
- Import/export and printable opname reports.

## Business Rules

- Only one draft or counted opname may exist per store at a time.
- Starting an opname snapshots every active inventory product and its current
  quantity and average cost.
- A physical quantity of zero is valid; a missing quantity means not counted.
- Every item must be counted before the session can be completed.
- Corrections use `physical - snapshot`, so sales/purchases after the snapshot
  do not change the discrepancy being posted.
- Active cashiers may record and complete counts but cannot start, cancel,
  reopen, or post an opname.
- Posting is atomic, immutable, audited, and cannot be repeated.

## Architecture Decisions

- Store sessions in `stock_counts` and snapshots in `stock_count_items`.
- Reuse `PostStockAdjustment` for positive and negative corrections.
- Link generated stock adjustments back to their stock count.
- Route-bind stock counts by public ULID and verify active-store ownership in
  every controller action and request.

## Transaction and Concurrency Strategy

- Lock the store row while creating a session to serialize the one-active-session rule.
- Lock the session and its items while changing workflow state.
- Lock inventory balances through the existing stock ledger while posting.
- Wrap all generated adjustment documents and the final status transition in
  one database transaction.

## Testing Strategy

- Snapshot and discrepancy calculations.
- Cashier entry/completion and posting denial.
- Owner/admin posting and generated movements.
- Cross-store denial.
- Incomplete count rejection, zero quantities, duplicate posting prevention,
  and preservation of movements made after the snapshot.

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

- 2026-08-20: Audited current inventory ledger, membership policy, active mobile
  layout, and operational tests. Chose a snapshot-difference workflow.
- 2026-08-20: Added stock-count schema, workflow actions, tenant-scoped routes,
  owner/admin approval rules, cashier counting access, mobile-first Inertia UI,
  stock-ledger integration, and feature tests.

## Commands Executed

- `php artisan migrate --force`
- `php artisan test --filter=StockCountTest`
- `php artisan test --filter=OperationalLedgerTest`
- `php artisan test`
- Targeted PHP syntax checks, Pint checks, and PHPStan analysis
- `npm run types:check`
- `npm run lint:check`
- `npm run format:check`
- `npm run build`

## Verification Results

- Migration applied successfully to the local `sisko-plan` database.
- Stock-count feature tests: 6 passed, 36 assertions.
- Operational ledger regression tests: 20 passed, 107 assertions.
- Full backend suite: 177 passed, 1,235 assertions.
- PHPStan targeted analysis passed with zero errors.
- TypeScript type check and ESLint passed.
- Production Vite build passed.
- Feature-owned frontend files pass Prettier. The repository-wide Prettier check
  remains red because of pre-existing formatting in `resources/js/pages/pos/index.tsx`.
- Automated browser setup failed before a browser could be selected because the
  configured browser runtime rejected its plugin dependency as outside a trusted
  code path. Responsive visual checks at the seven required widths therefore
  remain unverified; responsive behavior was reviewed from the layout code only.

## Remaining Risks and Limitations

- A count is only accurate when staff follow the displayed snapshot time and
  account for goods physically moving during counting.
- Visual browser QA is still required at 320, 375, 640, 768, 1024, 1280, and
  1536 pixels because the browser runtime was unavailable in this session.

## Completion Summary

Stock opname is implemented end to end. Owner/admin can start, reopen, cancel,
and post; every active member can count and complete; posting creates linked,
immutable stock adjustments using snapshot differences and records audit events.
