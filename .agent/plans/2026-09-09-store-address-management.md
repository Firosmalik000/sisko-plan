# Store Address Management — ExecPlan

## Status

Complete

## Goal

Capture and maintain a store address when an owner creates their first store,
adds another store, or edits an existing store, using the existing localized
customer experience.

## Repository State

The worktree contains unrelated in-progress changes. This implementation
preserves them and limits edits to the existing store-management flow, address
translations, and focused tests.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase file (`PHASE-10.md`; complete, used as current baseline)
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing relevant tests

## Dependencies and Prerequisites

- Existing `store_settings.address` persistence and store-settings relation.
- Existing `CreateStore` transaction and owner-authorized store update flow.
- Existing runtime UI literal translation catalogs.

## Scope

- Add an optional address field to the shared first/add-store form.
- Persist the address atomically with store creation.
- Add address editing to store management.
- Show the address on store list and detail surfaces.
- Add Indonesian, English, Malay, and Vietnamese UI copy.
- Add focused persistence, validation, and Inertia contract tests.

## Out of Scope

- Geocoding, maps, structured administrative regions, delivery zones, and
  changes to platform-admin store management.
- Duplicating the address on the `stores` table.

## Business Rules

- A store address is optional to preserve compatibility with existing stores.
- When supplied, it is plain text with a maximum length of 500 characters.
- The canonical value remains `store_settings.address`, including receipt use.

## Architecture Decisions

- Extend the existing request → controller → `CreateStore`/store-settings flow.
- Reuse the existing store-settings row rather than introducing a second source
  of truth.
- Keep tenant authorization and subscription enforcement unchanged.

## Database Changes

None. The nullable 500-character address column already exists on
`store_settings`.

## Backend Changes

- Validate address on create and update.
- Persist address in the existing creation transaction.
- Update address in the existing locked update transaction.
- Include address in customer store list/detail Inertia props.

## Frontend Changes

- Add a labeled address textarea to create and edit forms.
- Render address in store cards and detail summary.
- Add locale catalog entries for the label and placeholder.

## UI/UX Implementation Rules

- Keep forms compact and use no helper text.
- Preserve inline validation, touch-sized actions, wrapping, and scrollable
  mobile dialogs.
- Verify 320, 375, 640, 768, 1024, 1280, and 1536 pixel widths.

## Security and Tenancy Review

Address writes remain inside authenticated owner-authorized store flows. The
store identifier is route-bound and policy checked; no submitted tenant ID is
accepted.

## Transaction and Concurrency Strategy

Creation and update already use database transactions. Editing keeps the store
row lock and updates the related settings row in the same transaction.

## Testing Strategy

- Store creation persists the supplied address.
- Store update changes the address without affecting authorization.
- Store list/detail props expose the address.
- Address longer than 500 characters is rejected.
- Run focused feature tests, type/lint/format/i18n checks, build, UI detector,
  responsive browser QA, and final diff review.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and migration assessment
- [x] Backend domain
- [x] Authorization and validation
- [x] Frontend
- [x] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [x] Interface copy review (no unnecessary helper text)
- [x] Automated tests
- [x] Verification
- [x] Diff review
- [x] Documentation
- [x] Completion report

## Progress Log

- 2026-09-09: Traced store creation, management, settings, receipt, i18n, and
  tenancy tests. Confirmed `store_settings.address` is the existing canonical
  address and no migration is required.
- 2026-09-09: Implemented address validation, persistence, Inertia props,
  create/edit controls, list/detail display, and four-locale interface copy.
- 2026-09-09: Added regression coverage, completed responsive browser QA, and
  passed the full automated test suite and frontend quality gates.

## Discoveries and Deviations

- The profile settings surface already edits the same address and the receipt
  preview consumes it; duplicating the value on `stores` would create drift.
- Parallel PHPUnit execution was unavailable because the repository does not
  include ParaTest 7.x, so the complete suite was run successfully in serial.

## Commands Executed

- Repository searches and targeted source inspection with `rg` and
  `Get-Content`.
- Impeccable context setup and hardening/craft references.
- `php artisan test tests/Feature/StoreTenancyTest.php tests/Feature/CountryCurrencyTest.php tests/Feature/Settings/ProfileUpdateTest.php tests/Feature/LocaleTest.php`
- `php artisan test`
- `npm run types:check`, scoped ESLint and Prettier checks, `npm run i18n:check`,
  `npm run build`, scoped Pint, Impeccable detector, and `git diff --check`.
- In-app browser create, update, locale, cleanup, and responsive checks.

## Verification Results

- Focused backend suite: 53 tests passed with 384 assertions.
- Complete backend suite: 302 tests passed with 2,917 assertions.
- TypeScript type-check, scoped ESLint, scoped Prettier, Pint, i18n audit,
  production build, Impeccable detector, and whitespace diff check passed.
- Browser flow verified first-store creation, list/detail address display,
  address editing, and English copy; temporary QA data was removed.
- Create, edit, detail, and list surfaces passed at 320, 375, 640, 768, 1024,
  1280, and 1536 pixels without unintended horizontal overflow, clipped
  controls, overlapping content, or hidden primary actions.

## Remaining Risks and Limitations

- Existing stores keep a nullable address until an owner supplies one.
- Production build retains pre-existing optional `fontaine` and large-chunk
  warnings; neither is introduced by this change.

## Completion Summary

Store owners can now supply an optional localized address while creating their
first or subsequent store, edit it later, and see it consistently on store list
and detail screens. The existing canonical settings field is reused, with no
schema migration or tenancy-boundary change.
