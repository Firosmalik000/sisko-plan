# Sales History Filters — ExecPlan

## Status

Complete

## Goal

Make `/sales` fast to search when a receipt must be found again, including by customer identity captured at POS.

## Repository State

The working tree already contains unrelated and earlier POS/customer changes. Preserve them and limit this task to the sales history controller, page, focused tests, and this plan.

## Required Documents Read

- [x] `AGENTS.md`
- [x] `docs/phases/PHASE-5.md`
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing relevant tests

## Scope

- Search by receipt number, customer name, and customer phone.
- Filter by preset/custom date range, payment method, and customer presence.
- Preserve filters through pagination and receipt/return navigation.
- Show customer and payment method in each result.
- Keep the query store-scoped and cover the behavior with focused feature tests.

## Out of Scope

- Customer loyalty or points calculation.
- Customer management CRUD.
- Sales data mutation or schema changes.

## Architecture Decisions

- Keep filter state server-owned through GET query parameters and Inertia props.
- Search immutable sale snapshots; use the store-scoped customer phone normalization only to make formatted phone searches reliable.
- Reuse the expense history filter/form and responsive list patterns.

## Testing Strategy

- Feature-test each filter dimension and combined filtering.
- Verify pagination keeps query parameters.
- Run focused sales tests, formatting, lint, types, build, and responsive browser checks where the authenticated local flow permits.

## Implementation Milestones

- [x] Repository audit
- [x] Backend query and contract
- [x] Frontend filter and result presentation
- [x] Regression tests
- [x] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [x] Interface copy review
- [x] Verification
- [x] Diff review
- [x] Completion report

## Progress Log

- 2026-09-08: Inspected sales history, expense filters, customer snapshots, payment data, tenancy rules, and existing sales tests.
- 2026-09-09: Added the responsive filter panel and customer/payment details to sales results.
- 2026-09-09: Added receipt/customer/phone, payment, customer-presence, and custom-date regression coverage.

## Verification Results

- Sales history feature suite: 30 tests, 383 assertions passed.
- Focused sales history filter tests: 4 tests, 105 assertions passed.
- PHP syntax and Pint passed.
- TypeScript, scoped ESLint, scoped Prettier, i18n audit, and production build passed.
- Browser verified at 320, 375, 640, 768, 1024, 1280, and 1536px with no horizontal overflow; the custom date controls and primary action remained visible at 320px.
- Mobile and desktop screenshots were visually inspected in the authenticated local app.

## Remaining Risks and Limitations

- The local demo store had no sales records, so populated result cards were verified through the Inertia feature contract rather than live seeded browser content.
