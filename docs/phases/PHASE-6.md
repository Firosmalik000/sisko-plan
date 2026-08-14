# Phase 6 - Expenses, Dashboard, and Reports

## Status

Completed

## Required Outcomes

- Store owners and admins can maintain expense categories and post store expenses.
- Expense posting atomically decreases the selected financial account and remains immutable, audited, and idempotent.
- The dashboard shows current business-position metrics and month-to-date operating results from authoritative server data.
- Reports provide date-filtered revenue, COGS, gross profit, expenses, estimated operating profit, daily trends, and product performance.
- Cash, inventory, supplier payable, and low-stock positions remain clearly separated.
- All queries, references, and report results are isolated to the active store.

## Business Formulas

- Net revenue = posted sale revenue - sale refunds in the selected period.
- Net COGS = sale item COGS - return COGS reversals in the selected period.
- Gross profit = net revenue - net COGS.
- Estimated operating profit = gross profit - posted store expenses.
- Current business position uses current cash/bank, inventory, and supplier payable projections.

## Scope Decisions

- Expense categories are deactivated rather than hard deleted.
- Posted expenses are immutable; destructive cancellation or formal reversal is deferred.
- Expense and profit information is restricted to owner/admin members.
- Reports are operational estimates and must not be presented as audited accounting statements.
- Period attribution follows each posted document's `occurred_at` timestamp in the store timezone.

## Out of Scope

- Double-entry journals, balance sheets, tax reporting, payroll, budgeting, accrual expenses, attachments, formal exports, and audited financial statements.
