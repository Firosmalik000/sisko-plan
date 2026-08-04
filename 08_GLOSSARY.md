# Architecture and Product Decisions

Record durable decisions here.

## ADR-001 — Modular monolith

**Decision:** Use Laravel modular monolith with Inertia React for Stage 1.

**Reason:** Faster development and simpler authentication/deployment while preserving reusable domain Actions.

## ADR-002 — MySQL shared database

**Decision:** Use one MySQL database with store-scoped operational data.

**Reason:** Appropriate simplicity for Stage 1. Tenant isolation is enforced through Store Context, policies, scoped queries, constraints, and tests.

## ADR-003 — Platform Admin separation

**Decision:** Platform Admin is separate from customer Store Owner.

**Reason:** Platform management and tenant operation have different trust boundaries.

## ADR-004 — Stage 1 role

**Decision:** Expose only Owner as store role in Stage 1.

**Reason:** Keep small-store product simple while preparing `store_users` for future roles.

## ADR-005 — Moving weighted average

**Decision:** Use moving weighted average cost for inventory valuation and COGS.

**Reason:** Practical for small retail and simpler than batch/FIFO tracking.

## ADR-006 — Separate ledgers

**Decision:** Maintain separate stock, cash, and capital histories.

**Reason:** Modal, kas, persediaan, revenue, and profit are different concepts.

## ADR-007 — POS included

**Decision:** Stage 1 sales must include a practical POS interface, not only a generic sales form.

**Reason:** Point of Sale is a core small-store workflow.

## New decisions

Append future decisions using:

```text
## ADR-NNN — Title
Date:
Status:
Context:
Decision:
Consequences:
Affected phases:
```
