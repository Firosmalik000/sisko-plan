# Testing and Quality Standard

## Test pyramid

### Unit tests

Use for pure calculations and state rules:

- Moving average cost.
- Unit conversion.
- COGS.
- Gross profit.
- Payment allocation.
- Capital effects.
- Report formulas.

### Feature tests

Use for HTTP, authorization, validation, and database outcomes:

- Authentication.
- Store switching.
- Cross-store denial.
- CRUD ownership.
- Posting purchases.
- POS sales.
- Returns.
- Expenses.
- Subscription limits.

### Integration tests

Use for complete workflows:

```text
Register
→ Create store
→ Add cash capital
→ Create product
→ Purchase inventory
→ Sell through POS
→ Record expense
→ View report
```

### Browser tests

Use when the repository supports them, especially for:

- Onboarding.
- Store switcher.
- POS cart and payment.
- Printable receipt.
- Platform suspend flow.

## Required assertions

Do not assert only HTTP success.

Assert:

- Exact database records.
- Exact quantities.
- Exact monetary values.
- Correct store ownership.
- Correct status.
- Correct ledger entries.
- Correct rollback after failure.

## Cross-store test matrix

For store-owned resources test:

- Cannot view.
- Cannot list.
- Cannot update.
- Cannot delete.
- Cannot reference in a new transaction.
- Cannot include in report/export.
- Cannot use another store's product, supplier, or financial account ID.

## Transaction rollback tests

Force a failure after part of a workflow and prove:

- No partial sale.
- No partial stock movement.
- No partial cash transaction.
- No changed balance projection.
- No consumed document number unless explicitly designed.

## Concurrency-sensitive tests

Where practical, test or structurally verify:

- Document sequence locking.
- Inventory balance locking.
- Duplicate submission prevention.

## Verification commands

Use repository scripts. Typical:

```bash
php artisan test
npm run lint
npm run build
```

Also run:

- Focused test file first.
- Formatter if configured.
- Type check if separate.
- Static analysis if configured.
- Browser test if configured.
- Clean migration on test database for migration-heavy phases.

## Quality review checklist

Before completion:

- No N+1 in primary listings.
- Pagination present.
- Tenant indexes present.
- No money float.
- No client-authoritative totals.
- No unprotected write route.
- No hard deletion of posted transactions.
- No unexplained dependency.
- No out-of-scope module.
