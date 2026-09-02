# Purchasing and Supplier Management Workflow

## Status

Completed

## Goal

Make the Purchasing index a data-first operational page, move purchase and payment inputs into focused drawers, and make store-scoped Supplier management easy to discover and reach from Purchasing and navigation.

## Repository State

- Purchasing already posts immutable purchases and payments through tenant-scoped Laravel actions and displays purchase, payable, supplier, product, and account data in one Inertia page.
- The purchase and payment forms are currently rendered inline on the Purchasing index.
- Supplier master data already exists at `/master-data/suppliers` with store-scoped CRUD, search, status filtering, pagination, authorization, and modal create/edit forms.
- Supplier options on Purchasing come from the active store's `suppliers` table and include the payable projection.
- `resources/js/pages/master-data/products/index.tsx` has unrelated user changes and must not be modified.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active Phase 2 and Phase 4 plans/briefs
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing relevant tests

## Dependencies and Prerequisites

- Existing active-store and subscription middleware.
- Existing Purchasing and Master Data policies.
- Existing Supplier, Purchasing, payable, inventory, and cash ledger implementations.
- Existing Radix-based dialog/sheet UI primitives.

## Scope

- Replace inline Purchasing create/payment forms with action-triggered responsive drawers.
- Keep Purchasing history, supplier payable position, and payable ledger visible on the index.
- Add direct Supplier create/manage actions near the purchase supplier selector.
- Support opening the existing Supplier create modal from a query-string deep link.
- Add a visible Supplier navigation entry while retaining the Supplier tab under Master Data.
- Preserve scanner-to-purchase behavior by opening the purchase drawer after selections are confirmed.

## Out of Scope

- Editing, cancelling, deleting, or reversing posted purchases or payments.
- Supplier schema or payable ledger changes.
- Purchase returns, purchase orders, attachments, and aging reports.
- Refactoring unrelated master-data pages or the user's pending Product changes.

## Business Rules

- Posted purchases and payments remain immutable; only new purchase and payment actions are exposed.
- Only active suppliers may be selected for a new purchase.
- Supplier options and all writes remain scoped to the active store.
- Payment cannot exceed outstanding debt or available cash; server validation remains authoritative.

## Architecture Decisions

- Reuse existing controllers, requests, models, policies, and endpoints; this is a presentation/discoverability change.
- Use the existing Sheet primitive for long Purchasing forms and the existing ReferenceDataPage dialog for Supplier create/edit.
- Use URL query state only to request the existing Supplier create modal; do not duplicate Supplier creation inside Purchasing.

## Database Changes

None.

## Backend Changes

No production backend behavior change is expected. Existing Inertia contracts and authorization remain intact.

## Frontend Changes

- Add purchase and payment drawer state and header actions.
- Close/reset drawers only after successful posting.
- Add Supplier create/manage links above the supplier select.
- Add Supplier direct navigation entries in desktop/mobile application navigation.
- Teach `ReferenceDataPage` to open create mode from `?create=1` and remove that transient query after opening.

## UI/UX Implementation Rules

- Purchasing index must show operational data first; forms appear only after explicit actions.
- Keep labels and actions concise and avoid explanatory helper text unless it prevents a likely posting error.
- Preserve keyboard focus, accessible labels, disabled states, validation feedback, and scrollable drawer content.
- On narrow screens, drawers occupy the available width and keep primary submit actions reachable.

### Responsive Verification

- [x] `xs` — 320px
- [x] `sx` — 375px
- [x] `sm` — 640px
- [x] `md` — 768px
- [x] `lg` — 1024px
- [x] `xl` — 1280px
- [x] `2xl` — 1536px

## Security and Tenancy Review

- No browser-supplied store identifier is introduced.
- Supplier and purchasing routes remain protected by active-store middleware and existing Gates/Form Requests.
- Cross-store route binding and relation validation remain unchanged.

## Transaction and Concurrency Strategy

No change. Existing purchase/payment actions retain atomic ledger writes, idempotency, and lock ordering.

## Testing Strategy

- Extend Inertia feature assertions for Supplier page availability and store-scoped data.
- Run focused Purchasing and Master Data feature tests.
- Run frontend formatting, lint, type checks, and production build.
- Exercise Purchasing and Supplier flows in a signed-in browser at all required viewport widths when available.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and migrations (none required)
- [x] Backend domain (existing behavior retained)
- [x] Authorization and validation (existing behavior retained)
- [x] Frontend
- [x] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [x] Interface copy review (no unnecessary helper text)
- [x] Automated tests
- [x] Verification
- [x] Diff review
- [x] Documentation plan
- [ ] Completion report

## Progress Log

- 2026-09-01: Audited Purchasing end to end and confirmed Supplier data already comes from the active store's `suppliers` table.
- 2026-09-01: Confirmed Supplier CRUD/page already exists but is difficult to discover from Purchasing and primary navigation.
- 2026-09-01: Selected the existing ReferenceDataPage modal and application Sheet patterns for a data-first refactor.
- 2026-09-01: Moved purchase and payment forms into responsive drawers and preserved scanner-to-purchase handoff.
- 2026-09-01: Added direct Supplier create/manage links, Supplier menu access, and query-driven create modal opening.
- 2026-09-01: Added a tenant-isolation feature test for the Supplier page.
- 2026-09-01: Verified Purchasing and Supplier in an isolated signed-in browser fixture at all required viewport widths, then removed the temporary server and database.

## Discoveries and Deviations

- The requested Supplier page is already implemented; scope is therefore discoverability and direct access rather than creating duplicate CRUD.
- Purchase records cannot offer an edit action because Phase 4 explicitly makes posted documents immutable. The index will expose create and payment actions instead.
- Unrelated user/concurrent changes were present in Product, POS, shared Inertia middleware, header, and mobile layout files. They were preserved; only the Supplier navigation additions in the shared layout belong to this task.

## Commands Executed

- Repository searches with `rg` and `rg --files`.
- Read relevant source, test, standards, phase, and skill files with `Get-Content`.
- `git status --short`.
- Impeccable context inspection for the Purchasing surface.
- `node_modules\\.bin\\prettier --write ...`
- `npm run format:check`
- `npm run types:check`
- `npm run lint`
- `npm run build`
- `php artisan test tests/Feature/PurchasingTest.php tests/Feature/MasterDataTest.php`
- `php artisan test tests/Feature/MasterDataTest.php --filter=supplier_page_lists_only_the_active_store_suppliers`
- `vendor/bin/pint tests/Feature/MasterDataTest.php`
- Isolated SQLite migrations, fixture seed, temporary Laravel server, and in-app browser viewport checks.
- `git diff --check`, `git status --short`, and scoped diff review.

## Verification Results

- Purchasing and Master Data feature suites: 32 tests passed with 238 assertions before the added Supplier regression.
- Added Supplier regression: 1 test passed with 14 assertions.
- Pint: passed for the changed PHP test.
- ESLint: passed.
- Prettier: passed.
- TypeScript: passed.
- Vite production build: passed (3,797 modules transformed).
- Browser: Purchasing index, purchase drawer, payment drawer, Supplier index/modal, edit actions, and Supplier menu verified at 320, 375, 640, 768, 1024, 1280, and 1536px.
- No unintended horizontal page overflow was detected. The payable table remains intentionally horizontally scrollable inside its own container below its minimum table width.
- Drawer controls, Supplier actions, labels, submit actions, and close controls remained available at every tested width.

## Remaining Risks and Limitations

- The provided production URL redirected to login and no authenticated production session was available. Browser verification therefore used an isolated local SQLite fixture against the production build instead of production data.
- Purchase edit/cancel remains unavailable by design because posted purchase documents are immutable.

## Completion Summary

Purchasing is now data-first: create and payment input is progressively disclosed in responsive drawers, Supplier management is directly reachable from the purchase flow and application menu, and the existing store-scoped Supplier page opens directly in create mode when requested. Automated, build, tenancy, and seven-viewport browser checks passed.
