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

## Decision log format

Record future decisions with:

- Date.
- Decision.
- Context.
- Alternatives considered.
- Final choice.
- Consequences.
