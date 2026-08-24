# Configurable Plan Duration and Store Capacity — ExecPlan

## Status

Complete

## Goal

Make account store limits visible before store creation and make paid subscription periods follow a configurable plan duration from 1 through 12 months.

## Repository State

Existing Laravel/Inertia application with account-scoped subscriptions and a dirty worktree containing prior user changes.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active Phase 7 files
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing subscription tests

## Dependencies and Prerequisites

- Account-scoped subscriptions and trial identification migrations are applied.
- The active default trial plan remains the fallback for a new customer account.

## Scope

- Add and backfill paid plan duration.
- Add duration to plan management and pricing cards.
- Derive paid activation windows from the selected plan.
- Disable create-store actions at account capacity and reject direct form access.
- Retain transactional capacity enforcement.
- Append active-account renewals after existing coverage and expose subscription period history.

## Out of Scope

- Payment gateway checkout.
- Retroactively rewriting active subscription periods when a plan definition changes.
- Deleting or merging stores to fit a smaller plan.

## Business Rules

- `max_stores` counts all stores owned by the account.
- Paid duration is an integer from 1 through 12 months.
- Trial remains fixed at 30 days.
- Paid period end is inclusive: start plus configured months minus one day.

## Architecture Decisions

- `SubscriptionAccess` owns shared store-capacity state and the authoritative assertion.
- Shared Inertia props expose capacity to customer layouts; super-admin requests do not resolve customer capacity.
- Activation actions calculate dates server-side from persisted plan duration.

## Database Changes

- Add `plans.duration_months` as an unsigned tiny integer with default `1`.
- Backfill legacy plans whose names contain `1 Bulan` through `12 Bulan`.
- Provide a reversible down migration.
- Add `subscription_periods` with immutable commercial snapshots, activation metadata, indexes, and existing-period backfill.

## Backend Changes

- Validate duration between 1 and 12 for plan management.
- Lock the account owner and recheck store count during creation.
- Redirect direct create-form access when capacity is unavailable.
- Use duration in self-service and bulk activation.
- Queue renewal periods under the owner lock and promote due periods before access checks.

## Frontend Changes

- Add a 1–12 month selector to paid plan add/edit modals.
- Show the term in plan management and public pricing.
- Disable create-store affordances when the account is at its limit.
- Show renewal start dates on pricing and responsive period history on `/subscription`.

## UI/UX Implementation Rules

- No new helper paragraphs in management forms.
- Keep the duration label direct and the blocked store state visible.

### Responsive Verification

- [x] `xs` — 320px
- [x] `sx` — 375px
- [x] `sm` — 640px
- [x] `md` — 768px
- [x] `lg` — 1024px
- [x] `xl` — 1280px
- [x] `2xl` — 1536px

## Security and Tenancy Review

- Store usage is queried by authenticated owner ID; no request field selects another account.
- Direct URL and POST bypasses remain server-protected.
- Platform admins are excluded from customer capacity resolution.

## Transaction and Concurrency Strategy

- Owner row locking serializes concurrent store creation for one account.
- Plan and subscription locks remain in activation actions.

## Testing Strategy

- Feature tests cover shared capacity state, direct form redirect, POST rejection, duration boundaries, migration rollback/backfill, and 3/6-month activation dates.
- TypeScript, production build, formatting, browser breakpoints, and focused Laravel tests are verification gates.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and migrations
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

- 2026-08-24: Traced store creation and found UI/form access did not consume existing transactional capacity validation.
- 2026-08-24: Added plan duration schema, management UI, activation calculation, and regression coverage.
- 2026-08-24: Browser-verified public pricing at all required widths without horizontal overflow.
- 2026-08-24: Added sequential renewal periods, due-period promotion, trial snapshots, and responsive account subscription history.

## Discoveries and Deviations

- Capacity middleware initially resolved customer plan state for platform admins; regression testing exposed and removed that coupling.
- Authenticated management and customer visuals require an available signed-in browser session; their behavior is additionally covered by feature tests and TypeScript checks.

## Commands Executed

- `vendor/bin/pint ...`
- `npm run types:check`
- `php artisan test tests/Feature/SubscriptionManagementTest.php --compact`
- `php artisan migrate:status`
- `php artisan migrate --force`

## Verification Results

- Focused subscription suite: 25 tests passed.
- TypeScript check: passed.
- Local migration: applied; existing plans verified with expected duration and limits.
- Pricing widths 320, 375, 640, 768, 1024, 1280, and 1536: no horizontal overflow; cards, navigation, actions, text wrapping, and footer remained present.
- Renewal regression: repeated paid confirmations queue consecutively; the due package is promoted without shortening the active period.
- Renewal-focused subscription suite: 26 tests passed, 333 assertions.
- TypeScript and production build: passed.

## Remaining Risks and Limitations

- Existing active subscription periods intentionally retain their recorded dates after a plan duration edit.
- Gateway/payment settlement remains outside this phase.

## Completion Summary

Store creation now reflects account capacity throughout the customer UI and remains transactionally enforced. Paid plans can define 1–12 month terms, and new activations use that persisted duration.

Paid renewal now extends the account timeline instead of replacing active coverage, and customers can inspect active, scheduled, and completed periods from the subscription page.
