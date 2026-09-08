# Sales History Filters — ExecPlan

## Status

In progress

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
- [ ] Backend query and contract
- [ ] Frontend filter and result presentation
- [ ] Regression tests
- [ ] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [ ] Interface copy review
- [ ] Verification
- [ ] Diff review
- [ ] Completion report

## Progress Log

- 2026-09-08: Inspected sales history, expense filters, customer snapshots, payment data, tenancy rules, and existing sales tests.

## Verification Results

Pending.

## Remaining Risks and Limitations

Pending verification.

