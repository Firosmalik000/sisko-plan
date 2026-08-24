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
- One owner account has one active subscription shared by every store it owns.
- Plan limits for stores, active products, and distinct active staff are enforced across all stores owned by that account; the account owner does not consume a staff seat.
- Store portal access requires an operational subscription: trials need an unexpired end date, while active subscriptions need a started billing period that has not expired.
- A trial plan is identified explicitly by platform metadata, lasts 30 days, and can be used only once per owner account; changing plans must not erase trial history.
- An owner with a non-operational subscription may confirm an eligible active plan from public pricing, while an operational subscription cannot be silently replaced mid-period.
- Paid plans define a fixed duration from 1 through 12 months. Self-service and bulk activation derive the inclusive billing end date from that duration; changing a plan later does not rewrite an existing subscription period.
- A paid self-service renewal never shortens an operational subscription. It is appended after the latest scheduled period and becomes effective automatically on its start date.
- Subscription period history is account-scoped and preserves the plan name, price, duration, and date window that were confirmed at the time.
- Store capacity is enforced across all stores owned by the account at form entry and again transactionally when a store is created.

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
