# POS optional customer capture

## Status

Completed

## Goal

Allow a cashier to optionally attach a customer name and phone number to a sale without slowing down the primary POS flow, while preparing a stable customer identity for a future points system.

## Scope

- Add store-scoped customers identified by a normalized phone number.
- Store immutable customer name and phone snapshots on each sale.
- Add a collapsed-by-default customer card to POS.
- Show attached customer data on the sale receipt/detail.
- Localize the new UI and validation copy.

## Out of scope

- Point earning, redemption, balances, tiers, or customer management screens.

## Data and transaction decisions

- Customer data is optional, but name and phone must be supplied together.
- Customer identity is unique by store and normalized phone number.
- Repeated sales update the reusable customer profile while preserving each sale's snapshots.
- Customer resolution stays inside the existing sale transaction and idempotency hash.
- Existing sales remain valid with nullable customer fields.

## Verification

- Migration up/down on the isolated test database.
- POS feature tests for guest sale, customer creation, reuse, snapshot preservation, validation, and store isolation.
- TypeScript, lint, formatting, i18n audit, production build, and responsive browser QA at 320, 375, 640, 768, 1024, 1280, and 1536 px.

## Verification results

- Focused POS suite: 28 tests and 324 assertions passed.
- Full application suite: 296 tests and 2,758 assertions passed sequentially.
- Parallel execution was unavailable because the installed dependencies do not currently include ParaTest 7.x.
- The customer migration ran successfully on the local database.
- A clean temporary SQLite database completed migration up; the new customer migration also completed its rollback before an older intentionally irreversible migration stopped the broader rollback batch.
- TypeScript, repository-wide ESLint, scoped Prettier, three-language UI audit, and the production build passed.
- Responsive source review confirms a single-column customer form below 640 px and a two-column layout from 640 px upward, with full-width controls and no fixed-width content.
- Live responsive browser verification could not be completed: the current authenticated local account has no active store, and the isolated browser session could not populate the temporary login form. No live-browser success is claimed.

## Remaining limitation

- Point earning, balances, redemption, and customer management remain intentionally out of scope; the customer relationship and immutable sale snapshots are ready for that later phase.
