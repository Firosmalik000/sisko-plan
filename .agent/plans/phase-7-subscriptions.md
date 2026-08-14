# Phase 7 - Subscription and SaaS Platform Management

## Status

Completed

## Goal

Give the SaaS operator safe commercial controls over plans, store subscriptions, usage limits, and payment records without crossing into tenant operational ownership.

## Repository State

- Phase 1 through Phase 6 are complete in the working tree and remain uncommitted.
- Separate platform-admin authentication, platform audit, store status, tenant context, and operational write routes already exist.
- Root `PHASE-7.md` contains a shifted glossary, so the canonical brief is reconstructed in `docs/phases/PHASE-7.md`.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase registry and reconstructed Phase 7 brief
- [x] Product scope and business rules
- [x] Architecture and database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing Super Admin, store tenancy, product, and member tests

## Dependencies and Prerequisites

- Separate active Platform Admin guard and admin audit trail.
- Active-store middleware, membership roles, and store suspension controls.
- Store creation action and server-authoritative product/member writes.

## Scope

- Plan management with monthly price and active product/member limits.
- One subscription per store with lifecycle state and trial/current-period dates.
- Safe default-plan provisioning and existing-store backfill.
- Manual immutable subscription payment records and platform billing metrics.
- Read-only subscription enforcement plus product/member usage limits.
- Platform and store-facing subscription interfaces.

## Out of Scope

- Gateways, checkout, coupons, tax, prorating, refunds, multi-currency, metered billing, PDF invoices, dunning automation, and formal revenue recognition.

## Business Rules

- Only Platform Admin can mutate plans, subscriptions, and subscription payments.
- Store users never submit authoritative commercial status or limits.
- Missing, expired, past-due, suspended, or cancelled subscription blocks store writes but not reads.
- Trial validity uses `trial_ends_at`; active validity uses `current_period_end`; null end means no automatic expiry.
- Zero product/member limit means unlimited; positive limits count active records.
- Posted subscription payments are immutable and idempotent.

## Architecture Decisions

- Keep platform commercial tables separate from store operational ledgers.
- Use a dedicated subscription access service from middleware and limit-sensitive controllers.
- Apply write protection to the entire active-store route group and explicit limits inside product/member create transactions.
- Provision the default subscription in the same transaction as store creation.
- Backfill existing stores in the schema migration with an indefinite active default subscription.

## Database Changes

- Add `plans`, `subscriptions`, `subscription_payments`, and `platform_sequences`.
- Add tenant/status/period indexes, one-subscription-per-store uniqueness, payment receipt/idempotency uniqueness, and restrictive history foreign keys.

## Backend Changes

- Subscription enums/models, plan/subscription/payment actions, limit/access service, middleware, controllers, routes, dashboard metrics, and shared Inertia state.

## Frontend Changes

- Super Admin commercial-management page and navigation.
- Store subscription/usage/payment page and sidebar entry.
- Read-only subscription warning banner in the store shell.
- Subscription metrics on the platform dashboard and status on the store list.

## Security and Tenancy Review

- Platform writes require the dedicated active Platform Admin guard.
- Store subscription page resolves only the active store.
- Platform operator sees commercial metadata, not store operational records.
- Limit checks use locked store rows and active-store counts.
- Payment and subscription changes are audited with before/after metadata.

## Transaction and Concurrency Strategy

- Lock plans/default selection when changing the default plan.
- Lock store/subscription rows while changing commercial state or enforcing count limits.
- Generate payment receipt numbers through a locked platform sequence.
- Keep payment, subscription renewal, and admin audit in one transaction.
- Bind payment idempotency keys to a canonical request hash and recover unique-key races.

## Testing Strategy

- Cover default provisioning/backfill behavior, plan mutation, subscription mutation, payment/idempotency/immutability, read-only middleware, expired periods, product/member limits, guard isolation, store-facing tenant isolation, dashboard metrics, rollback, pagination, and full regression.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and migrations
- [x] Backend domain
- [x] Authorization and validation
- [x] Frontend
- [x] Automated tests
- [x] Verification
- [x] Diff review
- [x] Documentation
- [x] Completion report

## Progress Log

- 2026-08-08: Audited platform authentication, store tenancy, middleware, audit, navigation, and existing tests.
- 2026-08-08: Reconstructed canonical Phase 7 because root `PHASE-7.md` contains a shifted glossary.
- 2026-08-08: Added commercial schema, default subscription provisioning/backfill, lifecycle access service, capacity enforcement, and immutable payment posting.
- 2026-08-08: Added Platform Admin plan/subscription/payment management, tenant subscription visibility, warning banner, and commercial dashboard metrics.
- 2026-08-08: Completed focused and full regression verification, applied the local migration, and reviewed the final diff.

## Discoveries and Deviations

- Commercial enforcement must preserve historical tenant data, so non-operational subscriptions become read-only instead of making the store disappear.
- The local database contained no stores at migration time; automated tests verify backfill-compatible provisioning and every existing local store is nevertheless checked for a missing subscription.
- Vite's test manifest needed a production build before new Inertia pages could be asserted; this was an environment artifact rather than an application failure.

## Commands Executed

- `php artisan test tests/Feature/SubscriptionManagementTest.php`
- `php artisan test`
- `vendor/bin/phpstan analyse --memory-limit=1G`
- `vendor/bin/pint --dirty`
- `npm run types:check`
- `npm run lint`, followed by `npm run lint:check`
- `npm run format:check`
- `npm run build`
- `php artisan about --only=environment`
- `php artisan migrate --force`
- `php artisan migrate:status`
- `php artisan tinker --execute=...` for local provisioning counts
- `git diff --check`

## Verification Results

- Phase 7 focused suite: 7 tests, 86 assertions, all passing.
- Full regression suite: 135 tests, 791 assertions, all passing.
- PHPStan: no errors.
- TypeScript, ESLint, and Prettier checks: passing.
- Production Vite build: passing.
- Local migration: batch 11, status `Ran`.
- Local provisioning check: one default plan and zero stores without a subscription.

## Remaining Risks and Limitations

- Payments remain manual and do not validate settlement against an external gateway.
- Stage 1 does not provide proration, refunds, tax, coupons, dunning, invoice PDFs, metered billing, or revenue recognition.
- Capacity is enforced at application level under locked store rows; direct database writes remain an administrative responsibility.

## Completion Summary

Phase 7 is complete. Platform Admin can manage plans and store subscription lifecycles, post idempotent immutable payments, and monitor commercial metrics. Stores receive a default subscription, can inspect their plan and payment history, remain readable after expiry or suspension, and are prevented from new writes or exceeding configured product/member capacity.
