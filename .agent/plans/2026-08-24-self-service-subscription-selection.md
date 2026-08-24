# Self-service Subscription Selection and Trial Plan

## Status

Completed

## Goal

Make the trial plan explicit and seed-driven, remove manual plan-code entry, and let an authenticated account owner confirm an eligible plan from `/pricing` without being sent to the dashboard before activation.

## Repository State

- Laravel, Inertia, React, TypeScript, and MySQL modular monolith.
- Plan codes are generated internally; the canonical seeded trial is identified by `plans.is_trial`.
- One subscription row is scoped to an owner account through `subscriptions.user_id`.
- Expired subscriptions are redirected away from the store dashboard by `subscription.access`.
- `/pricing` renders responsive cards and only offers the dashboard when the account subscription is operational.

## Required Documents Read

- [x] `AGENTS.md`
- [x] `docs/phases/PHASE-7.md`
- [x] `docs/01_BUSINESS_RULES.md`
- [x] `docs/02_ARCHITECTURE.md`
- [x] `docs/03_DATABASE_STANDARDS.md`
- [x] `docs/04_SECURITY_TENANCY.md`
- [x] `docs/05_TESTING_QUALITY.md`
- [x] `docs/06_UI_UX_STANDARDS.md`
- [x] `tests/Feature/SubscriptionManagementTest.php`

## Dependencies and Prerequisites

- Existing account-scoped subscription migration must run before the new additive migration.
- Existing active-store creation continues to create the first account subscription.

## Scope

- Add explicit trial metadata to plans and account subscriptions.
- Add an idempotent trial plan seeder.
- Generate plan codes server-side and remove code from the management form.
- Render pricing offers as cards with current, available, and disabled trial states.
- Add an authenticated, owner-only confirmation endpoint that activates an eligible selected plan.
- Preserve portal blocking until selection succeeds.

## Out of Scope

- Payment gateway, invoice creation, proration, coupons, refunds, and automated renewal.
- Switching an already operational subscription mid-period.

## Business Rules

- Trial is available once per owner account.
- `plans.is_trial` identifies trial semantics; names and prices are not used to infer trial behavior.
- `subscriptions.trial_used_at` preserves trial history when the selected plan changes.
- Trial lasts 30 days from confirmation/first-store creation.
- A paid plan selected in this temporary manual flow becomes active immediately for its configured 1–12 month duration without creating a payment record.
- Only the account owner may select a plan.
- A plan whose limits are below current account usage cannot be selected.
- Member limits represent distinct active staff across the owner's stores; the owner account does not consume a staff seat.
- An already operational subscription is not silently replaced from pricing.

## Architecture Decisions

- Use an additive migration for `is_trial` and `trial_used_at`.
- Use `PlanSeeder` for the canonical trial plan and keep the internal code hidden from operators.
- Put the transactional selection invariant in a subscription action; the controller owns validation and redirect feedback.
- Keep the pricing page server-driven through explicit plan availability props.

## Database Changes

- Add indexed `plans.is_trial` with a safe `false` default.
- Add nullable `subscriptions.trial_used_at` and backfill it from existing `trial_ends_at` values.
- Rollback drops only the newly added columns.

## Backend Changes

- Seed/update the trial plan before optional demo-account seeding.
- Generate unique plan codes from names on creation and retain codes on update.
- Add the account-owner subscription selection action and route.
- Expose pricing state without trusting client-supplied status or plan attributes.

## Frontend Changes

- Replace the pricing ledger rows with responsive offer cards.
- Show trial-used, current-plan, owner-only, and loading states.
- Confirm selection in an accessible dialog before posting.
- Remove code from plan create/edit form and plan summary.
- Show trial dates in the subscription table and modal only while the lifecycle is trialing; otherwise show the billing period.

## UI/UX Implementation Rules

- Keep management copy compact and remove the existing modal helper description.
- Use text plus visual treatment for disabled/current states.
- Keep primary actions visible and touch-friendly at all required widths.

## Security and Tenancy Review

- Selection queries the subscription by authenticated owner `user_id`; request payload cannot choose an account or status.
- Plan is resolved by public ID and must be active.
- Server derives all dates, trial history, and lifecycle status.
- Selection and audit write occur in one transaction with row locks.

## Transaction and Concurrency Strategy

- Lock the owner, subscription, and selected plan during selection.
- Recheck trial eligibility and operational status after acquiring locks.
- Reject a second concurrent selection once the first has activated the subscription.

## Testing Strategy

- Migration up/down and trial-history backfill.
- Seeder idempotency and canonical trial flags.
- Automatic hidden code generation and uniqueness.
- Trial once-only, paid re-subscription, owner authorization, active-subscription rejection, capacity rejection, and audit.
- Pricing Inertia contract and visible states.
- Type check, lint, PHP formatting, production build, and responsive browser verification.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and seed data
- [x] Backend domain and authorization
- [x] Frontend cards and dialogs
- [x] Automated tests
- [x] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [x] Interface copy review
- [x] Verification and diff review
- [x] Documentation and completion report

## Progress Log

- 2026-08-24: Traced plan creation, account subscription access, pricing props, public shell, management form, and existing regression tests.
- 2026-08-24: Added trial metadata migration, canonical plan seeder, transactional owner selection, hidden code generation, and admin validation.
- 2026-08-24: Rebuilt pricing as responsive cards with confirmation/current/disabled states and corrected global public CTA behavior.
- 2026-08-24: Browser QA caught and fixed a missing internal plan ID that incorrectly marked every guest card as current.
- 2026-08-24: Applied migration batch 10 and `PlanSeeder` to the local database without resetting application data.
- 2026-08-24: Corrected trial date presentation, conditionally displayed lifecycle date fields, and excluded owners from staff-seat usage.

## Discoveries and Deviations

- `is_default` cannot safely represent trial semantics because default assignment and one-time eligibility are separate rules.
- The schema retains one mutable subscription row per account, so a durable `trial_used_at` marker is required when switching plans.
- Existing active unlimited records on the old default plan had to be normalized into 30-day trial windows during migration.
- Store owners are active store members for authorization but are not billable staff seats; capacity queries therefore exclude `store_user.user_id = owner_user_id` while still deduplicating staff across stores.

## Commands Executed

- Repository/document inspection with PowerShell and `rg`.
- `php artisan migrate --force` and `php artisan db:seed --class=Database\\Seeders\\PlanSeeder --force` on the confirmed local environment.
- Laravel Pint on changed PHP files.
- `php artisan test tests/Feature/SubscriptionManagementTest.php`.
- `php artisan test`.
- `npm run types:check`.
- ESLint on the four changed React components/pages.
- `npm run build`.
- Browser DOM, screenshots, navigation, and overflow checks at 320, 375, 640, 768, 1024, 1280, and 1536 pixels.
- `git diff --check` and scoped status/diff review.
- Read-only local database inspection of subscription dates and active store memberships for the three affected owner accounts.

## Verification Results

- Migration `2026_08_24_000000_identify_trial_plans` is applied locally in batch 10.
- Focused subscription suite: 22 passed, 242 assertions.
- Full Laravel suite: 200 passed, 1,448 assertions.
- TypeScript, ESLint, Pint, and production build passed.
- Browser QA passed at all seven required widths with no horizontal overflow and no application console errors.
- Desktop and mobile card composition, footer placement, and mobile navigation were visually inspected.
- Follow-up subscription regression suite: 23 passed, 247 assertions; full Laravel suite: 201 passed, 1,453 assertions.
- Follow-up TypeScript, targeted ESLint, Prettier, Pint, production build, and `git diff --check` passed.

## Remaining Risks and Limitations

- The temporary self-service paid activation does not prove payment; this is intentional until a payment flow is added.
- The authenticated confirmation modal is protected by feature tests and type/lint/build checks; browser screenshots used the unauthenticated public state to avoid handling account credentials.
- The follow-up admin-table/modal responsive pass could not enter the authenticated surface because the isolated QA browser had no signed-in session; no credentials were transmitted. Source-level responsive behavior, TypeScript, lint, build, and server contracts passed, but the seven-width visual pass for this follow-up remains unverified.
- Production build reports the existing optional `fontaine` optimization warning; it does not fail the build.

## Completion Summary

The trial is now explicit, seeded, normalized for existing records, and limited to one use per account. Plan codes are backend-only. Pricing presents plan cards and confirms eligible owner selections before activation, while active accounts may enter the dashboard and expired accounts remain blocked until selection succeeds. Trial rows now show their actual trial window, lifecycle forms show only relevant dates, and staff capacity excludes the owner while remaining account-scoped across all owned stores.
