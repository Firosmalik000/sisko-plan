# Capital Ledger UI and Validation — ExecPlan

## Status

Completed on 2026-08-20

## Goal

Make the owner-capital page compact, consistent, responsive, and easier to use; move posting into a dialog; remove the dark dialog overlay; and prevent inactive inventory fields from blocking cash-capital transactions.

## Repository State

The worktree already contained unrelated in-progress changes. This implementation only intentionally changed the capital request, capital controller response, capital page, shared dialog overlay, and the relevant operational-ledger test.

## Required Documents Read

- [x] `AGENTS.md`
- [x] `docs/phases/PHASE-3.md`
- [x] `docs/01_BUSINESS_RULES.md`
- [x] `docs/02_ARCHITECTURE.md`
- [x] `docs/03_DATABASE_STANDARDS.md`
- [x] `docs/04_SECURITY_TENANCY.md`
- [x] `docs/05_TESTING_QUALITY.md`
- [x] `docs/06_UI_UX_STANDARDS.md`
- [x] `tests/Feature/OperationalLedgerTest.php`

## Scope

- Replace the inline capital form with a responsive dialog.
- Add compact capital contribution, withdrawal, and document summaries.
- Provide mobile cards and a desktop table for history.
- Show current and projected cash/stock balances in the dialog.
- Exclude fields belonging to the inactive asset type during server validation.
- Replace the shared black dialog overlay with a light teal translucent blur.

## Out of Scope

- Changes to capital accounting rules.
- Reversal or editing of posted capital documents.
- Database schema changes.

## Business Rules

- Owner contributions and withdrawals remain separate from revenue and expenses.
- Cash and stock cannot become negative.
- Server-side posting, tenant scoping, idempotency, and atomicity remain authoritative.

## Architecture Decisions

- Keep the visual interaction in the React page.
- Keep inactive-field handling in the form request so non-UI clients receive the same behavior.
- Return account and product projections from the existing tenant-scoped controller query for UI previews.

## Database Changes

None.

## Backend Changes

- Capital validation excludes cash fields for inventory transactions and inventory fields for cash transactions.
- Capital page data now includes contribution/withdrawal totals and current account/product projections.

## Frontend Changes

- Posting form moved into a compact dynamic dialog.
- Added responsive summary, empty state, mobile history cards, badges, projected balances, and insufficient-balance prevention.
- Removed visible nonessential helper copy.

## Security and Tenancy Review

All account/product projection queries remain scoped to the active store. Existing policy authorization and server-authoritative posting are unchanged.

## Testing Strategy

- Regression feature test submits client-like stale fields for both cash and inventory capital types.
- TypeScript, targeted ESLint, PHP formatting, ledger feature tests, production build, and PHPStan were run.

## Verification Results

- [x] `xs` — 320px: single-column summaries/form/footer, two short transaction-type controls per row, mobile history cards.
- [x] `sx` — 375px: single-column summaries, horizontal dialog actions, mobile history cards.
- [x] `sm` — 640px: three-column summaries and two-column form layout.
- [x] `md` — 768px: desktop history table replaces mobile cards.
- [x] `lg` — 1024px: bounded content and dialog widths; no page-level horizontal overflow.
- [x] `xl` — 1280px: content remains bounded by the operations shell.
- [x] `2xl` — 1536px: content remains bounded by the operations shell.
- [x] Interface copy review: only labels, status, direct actions, and actionable validation remain visible.
- [x] TypeScript: passed.
- [x] Targeted ESLint: passed.
- [x] Pint: passed.
- [x] Operational ledger tests: 21 passed, 114 assertions.
- [x] Production build: passed.
- [ ] Live browser screenshots: blocked because the installed browser runtime rejected its own trusted service path.
- [ ] Full PHPStan: 16 pre-existing errors remain in unrelated dirty-worktree code; no error was reported for the capital changes.

## Remaining Risks and Limitations

Live viewport screenshots could not be captured in this session. Responsive verification used breakpoint and overflow inspection of the final component structure. Full PHPStan remains red due to unrelated existing errors, including an inventory-history expression elsewhere in the already-modified ledger controller.

## Completion Summary

Capital posting now uses a compact responsive dialog, the page has a clearer responsive summary/history layout, inactive form fields no longer trigger cross-type validation errors, and dialogs use a light teal blurred overlay instead of black.
