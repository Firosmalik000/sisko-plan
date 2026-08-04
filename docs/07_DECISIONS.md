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

## Decision log format

Record future decisions with:

- Date.
- Decision.
- Context.
- Alternatives considered.
- Final choice.
- Consequences.
