# AGENTS.md

## 1. Project Mission

Build **Sistem Toko Stage 1**, a professional multi-store SaaS for small retail businesses.

The product must be simple enough for a small shop owner, while preserving correct inventory, cash, capital, purchasing, Point of Sale, profit, tenancy, and audit foundations.

Stage 1 is a **store management and POS system**, not a full ERP or full accounting suite.

## 2. Instruction Precedence

Use the following sources in order:

1. The user's latest explicit instruction.
2. This `AGENTS.md`.
3. The active phase specification in `docs/phases/PHASE-N.md`.
4. `docs/01_BUSINESS_RULES.md`.
5. `docs/02_ARCHITECTURE.md`.
6. `docs/03_DATABASE_STANDARDS.md`.
7. `docs/04_SECURITY_TENANCY.md`.
8. `docs/05_TESTING_QUALITY.md`.
9. `docs/06_UI_UX_STANDARDS.md`.
10. Existing automated tests and established repository patterns.
11. Other project documentation.

When sources conflict, do not silently choose. State the conflict, select the safest interpretation consistent with Stage 1, and record the decision in `docs/07_DECISIONS.md`.

## 3. Short Phase Command Protocol

When the user says only:

- `Phase 1`
- `Kerjakan Phase 2`
- `Lanjut Phase 3`
- or another clear reference to a numbered phase

treat it as the complete instruction below:

1. Read this file and the selected `docs/phases/PHASE-N.md`.
2. Read all project documents required by that phase.
3. Inspect the current repository and existing tests.
4. Check whether dependencies from earlier phases are actually complete.
5. Create or update an ExecPlan under `.agent/plans/`.
6. Implement only the active phase scope.
7. Add or update automated tests with the implementation.
8. Run all relevant tests, linting, type checks, and production builds.
9. Review the complete diff for correctness, tenancy, security, transaction safety, rounding, and scope creep.
10. Update relevant documentation, phase status, and decisions.
11. Return the completion report defined in `templates/COMPLETION_REPORT.md`.

Do not require the user to repeat these instructions.

If the requested phase depends on incomplete earlier work, first complete only the missing prerequisite necessary to make the active phase safe. Clearly report this deviation.

## 4. Technology Stack

Use the repository's installed compatible versions of:

- Laravel
- Inertia
- React
- TypeScript
- MySQL
- Tailwind CSS
- Pest or PHPUnit, following the repository's established test framework

Stage 1 architecture:

- Modular monolith
- Server-side Laravel routes and authorization
- React UI through Inertia
- Shared MySQL database with store-scoped data
- Session authentication

Do not split the React frontend and Laravel backend into separate applications during Stage 1.

Do not introduce microservices.

Do not replace MySQL unless explicitly instructed.

## 5. Product Boundaries

Stage 1 includes:

- Platform Super Admin
- Owner customer account
- One account owning or joining multiple stores
- Store switcher
- Product, category, unit, supplier, and financial-account master data
- Inventory balances and stock movements
- Cash, bank, and e-wallet accounts
- Owner capital contributions and withdrawals
- Purchases, supplier debt, and purchase payments
- POS sales, payments, receipts, returns, COGS, and gross profit
- Operating expenses and cash transfers
- Store dashboards and reports
- SaaS plans, subscriptions, limits, suspension, and platform management
- Audit, security, backup readiness, and pilot hardening

Stage 1 excludes unless a phase explicitly says otherwise:

- Complex employee roles
- Multi-warehouse
- Full double-entry accounting
- Formal tax accounting
- Payroll
- Marketplace integrations
- Mobile application
- Offline-first POS
- Manufacturing
- Bill of Materials
- MRP
- Enterprise procurement approval chains
- Microservices

## 6. User and Platform Model

There are two management surfaces:

### Platform Management

Used by the SaaS operator through Platform Admin accounts.

### Store Management

Used by SaaS customers through regular User accounts.

Platform Admin is not automatically a store member.

Stage 1 operational store role is only:

- `owner`

The schema may prepare a membership table for future roles, but do not expose unfinished roles.

## 7. Multi-Store and Tenancy Rules

- One user may own or join multiple stores.
- Operational data belongs to a store, not directly to a user.
- Every store-owned table must contain `store_id`, except child tables whose parent is strictly store-bound and safely enforced.
- Prefer including `store_id` on high-risk transaction children when it materially improves integrity and query safety.
- Never trust `store_id`, `user_id`, totals, cost, profit, or status received from browser input.
- Resolve the active store from an authorized route binding or server-side Store Context.
- Verify membership and store status for every store request.
- Scope all store-owned queries to the active store.
- Never use unrestricted access such as `Product::all()` for tenant-owned data.
- Unique constraints for tenant-owned data normally include `store_id`.
- Cross-store foreign references must be impossible through validation, authorization, and database design.
- Add automated tests proving cross-store read, create-reference, update, delete, export, and report access are rejected.

Examples:

- `unique(store_id, sku)`
- `unique(store_id, barcode)`
- `unique(store_id, document_number)`

## 8. Core Financial Concepts

The following are different:

- Owner capital
- Cash and bank balances
- Inventory quantity
- Inventory value
- Revenue
- Cost of goods sold
- Gross profit
- Operating expenses
- Estimated operating profit
- Supplier payable

Never merge these concepts into one mutable `modal` field.

Maintain separate histories for:

- Stock movements
- Cash transactions
- Capital transactions

### Cash capital contribution

- Cash increases
- Owner capital increases
- Inventory does not change
- Revenue and profit do not change

### Inventory capital contribution

- Inventory quantity and value increase
- Owner capital increases
- Cash does not change
- Revenue and profit do not change

### Owner withdrawal

- Cash or inventory decreases according to withdrawal form
- Owner capital decreases
- It is not an operating expense

### Cash inventory purchase

- Inventory increases
- Cash decreases
- Capital does not directly change
- Profit does not directly change

### Credit inventory purchase

- Inventory increases
- Supplier payable increases
- Cash changes only when payment occurs
- Profit does not directly change

### Sale

- Inventory decreases
- Inventory value decreases by COGS
- Revenue is recorded
- Payment increases the selected financial account
- Gross profit is net sales minus COGS

### Operating expense

- Cash decreases
- Operating profit decreases
- Inventory and owner capital do not directly change

## 9. Inventory and Costing Rules

Use:

- `stock_movements` as inventory history
- `inventory_balances` as the current fast-read projection
- Moving weighted average cost for Stage 1

Do not rely only on `products.current_stock`.

Every inventory change must create a stock movement.

Supported movement reasons include:

- Opening stock
- Purchase
- Sale
- Sales return
- Purchase return
- Capital contribution in inventory
- Capital withdrawal in inventory
- Adjustment in
- Adjustment out
- Damaged
- Lost
- Reversal

Landed cost may include:

- Purchase price
- Allocated inbound freight
- Allocated handling or directly attributable acquisition costs
- Less purchase discounts

Store a unit-cost snapshot and total COGS on sale items.

Historical profit must not change because of later purchases or product edits.

Negative stock is disabled by default.

Use database transactions and row locks for concurrent stock-changing workflows.

## 10. POS Rules

The sales interface must function as a practical Point of Sale:

- Search products
- Scan or input barcode
- Add to cart
- Change quantity
- Apply allowed discount
- Validate stock
- Select payment method and financial account
- Calculate paid amount and change
- Post sale atomically
- Reduce stock
- Record COGS and gross profit
- Record payment and cash transaction
- Produce printable receipt
- Support controlled cancellation or return

Client-side calculations are for display only. The server must recalculate all authoritative totals.

## 11. Transaction Integrity

Use database transactions for all workflows that change more than one business record.

Examples:

- Posting purchase
- Recording purchase payment
- Posting POS sale
- Processing return
- Stock adjustment
- Capital contribution
- Capital withdrawal
- Financial account transfer
- Cancellation or reversal

On failure, roll back the entire workflow.

Posted transactions are immutable.

Do not directly edit or hard-delete posted stock or financial transactions.

Corrections use:

- Cancellation
- Reversal
- Return
- Adjustment

Drafts may be edited or deleted according to phase rules.

Use idempotency protection where duplicate submission could create duplicate money, stock, or external-payment effects.

## 12. Backend Engineering Standards

- Keep controllers thin.
- Use Form Requests for validation.
- Use Policies or equivalent server-side authorization.
- Put business workflows in focused Actions or Services.
- Use query objects or dedicated report services for complex reporting.
- Do not put domain rules in React components.
- Do not duplicate formulas across controllers.
- Use enums or value objects for important statuses and categories when beneficial.
- Use explicit return types where supported.
- Avoid speculative abstractions.
- Avoid repository-pattern boilerplate unless it solves a demonstrated need.
- Do not add dependencies without explaining and testing the need.
- Follow existing naming and formatting conventions.

A typical write flow:

1. Resolve authorized context.
2. Validate input.
3. Call one business Action.
4. Execute transaction and locks inside the Action.
5. Return a response or redirect.
6. Dispatch non-critical side effects only after commit.

## 13. Frontend Standards

- Use React with TypeScript.
- Avoid `any`.
- Reuse established UI components.
- Keep pages focused on interaction and presentation.
- Keep business authority on the server.
- Never use hidden buttons as authorization.
- Display validation errors clearly.
- Use Indonesian wording understandable to small shop owners.
- Build responsive screens suitable for desktop and mobile.
- POS desktop flow must prioritize speed and keyboard/barcode use.
- Destructive actions require clear confirmation.
- Loading, empty, error, and disabled states must be handled.

## 14. Database Standards

Use:

- MySQL
- InnoDB
- `utf8mb4`
- Foreign keys
- Reversible migrations where practical

Recommended types:

- Money: `DECIMAL(19,4)`
- Quantity: `DECIMAL(18,6)`

Never use `FLOAT` or `DOUBLE` for money.

Indexes must support:

- Store scoping
- Document lookup
- Transaction date filtering
- Status filtering
- SKU and barcode lookup
- Supplier/customer relationships

Document numbers must be unique per store and generated safely under concurrency.

## 15. Security Rules

- Enforce authentication and authorization on the server.
- Prevent cross-store access.
- Protect against mass assignment.
- Validate IDs and relationships inside the active store.
- Keep CSRF protection enabled.
- Rate-limit authentication and sensitive endpoints.
- Validate uploads by MIME type, extension, size, and authorization.
- Do not expose secrets, passwords, tokens, raw stack traces, or sensitive environment values.
- Audit sensitive admin and business actions.
- Use stronger authentication for Platform Admin, preferably 2FA before production.
- Do not weaken security to make tests pass.
- Do not run destructive database commands against an unknown environment.

## 16. Testing and Verification

Every business behavior requires appropriate automated tests.

At minimum, the completed Stage 1 test suite must cover:

- Authentication
- Platform Admin isolation
- Store membership and switching
- Cross-store denial
- Master-data ownership
- Purchase stock increase
- Cash purchase cash decrease
- Credit purchase payable increase
- Purchase payment
- Moving-average cost
- POS stock decrease
- POS payment and cash increase
- COGS and gross-profit calculation
- Insufficient-stock rejection
- Cash capital contribution
- Inventory capital contribution
- Owner withdrawal
- Expense recording
- Account transfer
- Return
- Cancellation and reversal
- Database rollback on failure
- Subscription limits and suspension

Run repository-supported commands, typically:

```bash
php artisan test
npm run lint
npm run build
```

Also run relevant focused tests first.

If the repository provides formatter, static analysis, type checking, browser tests, or CI scripts, run the relevant commands.

Never claim a command passed unless it was actually executed successfully.

## 17. Phase Execution Rules

Before changing code:

1. Inspect the repository.
2. Read the active phase file.
3. Verify previous phase prerequisites.
4. Identify existing patterns and conflicts.
5. Create or update the ExecPlan.
6. State assumptions and risks in the plan.

During implementation:

1. Work in small coherent milestones.
2. Keep changes within phase scope.
3. Add tests alongside behavior.
4. Preserve working behavior.
5. Avoid unrelated formatting or refactors.
6. Update the ExecPlan progress and decision log.
7. Update documentation when behavior changes.

After implementation:

1. Review the complete diff.
2. Run required verification.
3. Check tenancy, authorization, transactions, locks, rounding, snapshots, and status transitions.
4. Confirm migrations work on a clean test database.
5. Confirm no unfinished UI is exposed.
6. Update phase status.
7. Produce the required completion report.

## 18. Git and Safety

- Prefer one branch and coherent commit series per phase.
- Do not rewrite unrelated history.
- Do not delete user work.
- Do not force push.
- Do not commit secrets or local environment files.
- Before destructive actions, inspect the environment and obtain explicit user approval when required.
- A dirty working tree must be inspected before edits; preserve unrelated user changes.

## 19. Definition of Done

A phase is complete only when:

- Its required behavior is implemented.
- Acceptance criteria are met.
- Automated tests are added and passing.
- Relevant lint/type/build commands pass.
- Tenancy and authorization are proven.
- Database workflows are transaction-safe.
- Documentation and phase status are updated.
- The diff contains no unexplained out-of-scope changes.
- Known limitations are reported honestly.

## 20. Required Completion Report

Use `templates/COMPLETION_REPORT.md`.

Always include:

- Summary
- Implemented scope
- Architectural decisions
- Files created and modified
- Migrations
- Tests
- Commands actually executed
- Results
- Tenancy/security review
- Known limitations
- Recommended next phase or task

Never describe partially verified work as fully complete.
