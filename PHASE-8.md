# Phase 6 — Expenses, Dashboard, and Reports

## Goal

Give the Owner a clear and honest view of store operations without pretending Stage 1 is full formal accounting.

## Dependencies

- Phase 5 sales complete.

## Scope

### Expenses

- Expense entry.
- Expense categories.
- Selected financial account.
- Attachment where supported.
- Cancellation/reversal.
- Expense history.

### Dashboard

- Sales today.
- Transaction count.
- Gross profit.
- Expenses.
- Cash and account balances.
- Inventory value.
- Supplier payable.
- Net owner contribution.
- Estimated business value.
- Low/out-of-stock products.
- Recent activity.
- Date comparison where practical.

### Reports

- Sales.
- Purchases.
- Inventory quantity.
- Inventory movements.
- Inventory valuation.
- Cashflow.
- Capital.
- Supplier payable.
- Gross profit.
- Estimated operating profit.
- Expense by category.
- Export CSV/Excel/PDF according to repository capability.

## Out of scope

- Formal balance sheet.
- Formal journal/general ledger.
- Tax filing.
- Consolidated multi-company accounting.
- Advanced BI.

## Critical formulas

```text
net sales = gross sales - discounts - sales returns
gross profit = net sales - COGS
estimated operating profit = gross profit - operating expenses - recognized stock losses
net owner contribution = contributions - withdrawals
estimated business value = cash + inventory value - supplier payable
```

Clearly label estimated values.

## Required tests

- Expense cash reduction.
- Expense does not alter owner capital.
- Dashboard store scope.
- Date filters.
- Report reconciliation with ledger fixtures.
- Returns reflected correctly.
- Cross-store report/export denial.
- Large listing pagination.
- Export authorization.

## Acceptance criteria

- Reports reconcile with transactions.
- User language is understandable.
- No formal-accounting claims are made.
- Performance is reasonable for pilot data.
- Tests and build pass.
