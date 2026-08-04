# Business Rules

## Product level rules

- Stage 1 is a modular monolith.
- The application serves multiple stores from one shared database.
- Store data must never leak across tenants.
- The platform operator can administer the SaaS, but does not own store records.

## Ownership and access

- A user may belong to one or more stores.
- Every store action requires authentication and an active store context.
- A user must not access another store by changing an ID in the URL or request payload.
- Sensitive platform actions require the platform admin surface and separate authorization.

## Transaction rules

- Posted business transactions are server-authoritative.
- Totals, costs, margins, balances, and document numbers must be derived on the server.
- Every financial or stock change must be recorded in a traceable ledger or history table.
- Multi-row workflows must be atomic.
- Duplicate submission must be prevented where the action is not safe to repeat.
- Posted records are immutable unless the workflow explicitly supports reversal or cancellation.

## Data rules

- Money must use decimal-safe values.
- Quantity must use decimal-safe values.
- Stock cannot become negative unless the phase explicitly allows a controlled exception.
- Master data that is referenced by posted transactions must not be hard-deleted unsafely.
- All relational IDs must be validated through the active store scope.

## Reporting rules

- Reports are operational, not formal audited accounting.
- Labels should favor simple business language that small-shop owners understand.
- The UI should clearly separate stock value, cash balance, supplier debt, and estimated profit.

## Phase sequencing rules

- Later phases depend on earlier platform and tenancy foundations.
- If a prerequisite is missing, only the minimum safe prerequisite work should be completed first.
- Phase scope should stay narrow and aligned to the active phase document.
