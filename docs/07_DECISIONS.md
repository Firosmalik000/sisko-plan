# Decisions

This file records decisions that shape Stage 1 implementation.

## Initial decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-08-03 | Use Laravel, Inertia, React, TypeScript, and MySQL as the Stage 1 stack. | Matches the repository starter and keeps the app modular monolith-based. |
| 2026-08-03 | Keep store data store-scoped with explicit authorization checks. | Prevents cross-store leakage and URL tampering. |
| 2026-08-03 | Use decimal-safe numeric types for money and quantity. | Avoids floating-point errors in inventory and finance. |
| 2026-08-03 | Keep posted transactions immutable unless a phase explicitly defines reversal or cancellation. | Preserves auditability and prevents silent history changes. |
| 2026-08-03 | Prefer server-authoritative totals and document numbers. | Prevents client tampering and duplicate submission errors. |
| 2026-08-06 | Store purchase and selling prices per product unit, with one server-enforced base unit factor of `1`. | Supports retail packaging without duplicating products and prepares purchasing/POS for unit snapshots. |
| 2026-08-06 | Deactivate master data instead of exposing hard delete workflows. | Preserves references for immutable transactions introduced in later phases. |
| 2026-08-06 | Defer financial-account opening balances to the Phase 3 ledger. | A mutable balance on master data would violate traceability and transaction rules. |
| 2026-08-08 | Treat expense and profitability reporting as owner/admin-only operational estimates. | Protects sensitive cost data from cashiers and avoids presenting Stage 1 metrics as audited accounting. |
| 2026-08-08 | Attribute sales, returns, and expenses to their own posting dates in the store timezone. | Produces traceable period reports and handles returns posted after the original sale without mutating history. |
| 2026-08-08 | Model subscriptions per store and preserve tenant reads when a subscription is non-operational. | Commercial enforcement must block new writes without hiding or corrupting historical operational data. |
| 2026-08-08 | Treat a zero plan limit as unlimited and count only active products and memberships for positive limits. | Keeps the default plan backward compatible while making commercial capacity predictable and reversible. |
| 2026-08-08 | Record Stage 1 subscription payments manually as immutable, idempotent platform records. | Provides auditable renewal and revenue controls without implying a payment-gateway or accounting integration. |
| 2026-08-08 | Require confirmed TOTP for every active Platform Admin in production while keeping its guard and challenge session separate from store users. | Platform-wide authority needs a second factor without weakening tenant authentication boundaries. |
| 2026-08-08 | Separate process liveness (`/up`) from dependency readiness (`/ready`) and fail production deployment through `app:production-check`. | A running PHP process does not prove that database, cache, migrations, sessions, or operator security are safe for traffic. |
| 2026-08-08 | Keep deployment, backup, restore, and incident procedures infrastructure-neutral but version-controlled and mandatory for pilot go-live. | Stage 1 should be operable on the selected host without pretending the repository itself provides managed backups, monitoring, or failover. |
| 2026-08-22 | Supersede the per-store subscription decision with one subscription per owner account and aggregate store, product, and distinct-staff limits across all owned stores; the owner does not consume a staff seat. | The commercial package is purchased by the account, while stores remain isolated operational tenants; this also makes configurable store and staff limits meaningful. |
| 2026-08-22 | Require an operational account subscription before any store portal page is accessible, while keeping the subscription status page available to the owner. | Expired trials and active records without a started period must not expose tenant operations merely because the request is read-only. |

## 2026-08-24 — Trial identity and self-service plan confirmation

- Trial semantics use `plans.is_trial`; `is_default`, plan names, prices, and internal codes are not authoritative trial indicators.
- Trial history uses `subscriptions.trial_used_at` so a mutable account subscription cannot regain eligibility after a plan change.
- The trial plan is seeded idempotently. Plan codes remain internal and are generated from plan names by the backend.
- Trial subscriptions display their `starts_at`–`trial_ends_at` window; non-trial subscriptions display the billing period. Irrelevant date fields are cleared when lifecycle type changes.
- Public pricing may activate an eligible plan only for the authenticated account owner, after confirmation and server-side capacity checks.
- Paid confirmation creates an active period using the selected plan's configured 1–12 month duration without a payment record. Gateway checkout remains out of scope.
- Account store capacity is exposed before rendering create-store actions and rechecked under an owner lock during creation, so direct requests and concurrent submissions cannot bypass the limit.
- Paid confirmations made during an active subscription are appended to `subscription_periods` after the latest queued end date. The mutable `subscriptions` row continues to represent the currently effective package and is promoted from the timeline when a scheduled period begins.

## Decision log format

Record future decisions with:

- Date.
- Decision.
- Context.
- Alternatives considered.
- Final choice.
- Consequences.
