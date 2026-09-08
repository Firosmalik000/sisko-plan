# Dynamic Add-on Management for Account Subscriptions

## Status

Completed

## Goal

Allow authorized platform admins to edit an account's base subscription and manage multiple assigned add-ons in one clear, responsive modal.

## Repository State

Account subscriptions are edited from `resources/js/pages/platform/subscriptions/index.tsx`. The existing PATCH endpoint only updates the base subscription. Add-ons are stored as entitlement snapshots in `subscription_addons`, summed by `SubscriptionEntitlements`, and currently created only by self-service purchases.

## Required Documents Read

- [x] `AGENTS.md`
- [x] `01_BUSINESS_RULES.md`
- [x] `02_ARCHITECTURE.md`
- [x] `04_SECURITY_TENANCY.md`
- [x] `05_TESTING_QUALITY.md`
- [x] `DESIGN.md`
- [x] Existing subscription actions, models, migrations, controller, page, and feature tests

## Dependencies and Prerequisites

No new package or schema dependency.

## Scope

- Expose assigned add-ons and eligible add-on plans to the edit modal.
- Support adding multiple add-on rows and editing their plan and validity dates.
- Support explicitly removing assigned add-ons.
- Reconcile the base subscription and add-ons atomically with audit metadata.
- Add focused feature coverage and responsive browser verification.

## Out of Scope

- Changes to customer self-service checkout.
- New plan or add-on schema.
- Destructive database reset or backfill.

## Business Rules

- Only base plans may be selected as the account's primary plan.
- Only add-on plans may be assigned as add-ons.
- An inactive plan remains editable only when already assigned.
- Multiple rows may use the same add-on plan; entitlements are cumulative.
- Each add-on end date must be on or after its start date.
- Removing an existing row is explicit and audited.

## Architecture Decisions

Extend the existing subscription PATCH contract with an `addons` array. Reconcile by public ID inside `ManageSubscription`; snapshot entitlement values from the selected plan on every create/update so browser values are never authoritative.

## Database Changes

None.

## Backend Changes

- Validate nested add-on input and ownership.
- Lock the subscription and its add-ons during reconciliation.
- Create, update, and remove add-ons in the existing transaction.
- Record before/after add-on snapshots in the platform audit log.

## Frontend Changes

- Add a dedicated add-on section to the edit modal.
- Use dynamic rows with plan, start, end, and remove actions.
- Keep validation errors adjacent to the add-on section.
- Keep actions accessible and usable from 320px through 1536px.

## Security and Tenancy Review

The route retains `SUBSCRIPTIONS_MANAGE`. Submitted plan and add-on public IDs are resolved server-side; existing add-on IDs must belong to the target subscription.

## Transaction and Concurrency Strategy

Use the existing transaction and lock the subscription plus assigned add-on records. Retry the transaction on transient conflicts.

## Testing Strategy

Feature tests will cover multiple creates, updates, removal, cumulative entitlement behavior, invalid cross-subscription IDs, invalid plan kinds, and date validation. Run the focused suite, formatter, type-check, lint, build, diff check, and browser QA.

## Implementation Milestones

- [x] Repository audit
- [x] Backend contract and atomic reconciliation
- [x] Dynamic modal UI
- [x] Automated tests
- [x] Responsive verification
- [x] Diff review
- [x] Completion report

## Progress Log

- 2026-09-08: Traced route, controller, action, model, entitlement service, migration, UI, and tests.
- 2026-09-08: Added atomic add-on reconciliation, server-owned entitlement snapshots, dynamic modal rows, and focused regression coverage.
- 2026-09-08: Browser-verified existing rows, a third dynamically-added row, fixed actions, and overflow at all required widths without saving local data.
- 2026-09-08: Clarified the account list by grouping equivalent active add-ons, exposing scheduled add-ons separately, and showing current entitlement totals. Corrected the modal preview so future add-ons are not counted as currently active.
- 2026-09-08: Polished the full management page with a clearer summary header, separated base/add-on catalog, compact filters, and responsive subscription cards below the wide-table breakpoint.

## Discoveries and Deviations

- Add-ons are already modeled as independent snapshot rows, so no schema migration is needed.

## Commands Executed

- `php artisan test --compact tests\Feature\SubscriptionManagementTest.php`
- `npm run types:check`
- `node_modules\.bin\eslint resources/js/pages/platform/subscriptions/index.tsx`
- `node_modules\.bin\prettier --write resources/js/pages/platform/subscriptions/index.tsx`
- `vendor\bin\pint --dirty`
- `npm run build`
- `git diff --check`
- Impeccable detector and in-app browser responsive checks.

## Verification Results

- Subscription feature suite passed: 35 tests and 515 assertions.
- TypeScript, scoped ESLint, Prettier, build, Impeccable detector, and diff check passed.
- Browser confirmed two existing add-ons render, a third row can be added, and all three remove actions remain available.
- Browser viewport checks passed at 320, 375, 640, 768, 1024, 1280, and 1536px with no page, dialog, or scroll-area horizontal overflow and the primary save action visible.
- Browser confirmed the reported third add-on is persisted but scheduled for 8 October 2026, while the first two are active through 7 October 2026. The account list now renders `2 add-on aktif`, `1 add-on terjadwal`, their periods, and the correct current capacity.
- The polished page was rechecked at every required viewport: cards remain readable from 320px through 1280px, the full table activates at 1536px, no horizontal page overflow occurs, and the browser console has no errors.

## Remaining Risks and Limitations

- The browser verification intentionally did not submit the form, so local account data was not changed. Persistence behavior is covered by isolated feature tests.
- A final PHP-only focused rerun could not start after the last defensive type guard because the resumed shell no longer exposed PHP on PATH; the full suite had passed immediately before that guard. TypeScript, ESLint, and diff checks remained green.

## Completion Summary

Platform admins can now add, edit, schedule, and explicitly remove multiple add-ons while editing an account subscription. The server validates ownership and plan kind, snapshots entitlement values, reconciles all writes atomically, and audits before/after state without schema or data migration.
