# Phase 5 — Point of Sale, Sales, COGS, and Returns

## Goal

Deliver a practical Point of Sale that posts sales atomically and calculates COGS and gross profit correctly.

## Dependencies

- Phase 4 purchasing and inventory cost complete.

## Scope

### POS UI

- Product search.
- Barcode input/scan.
- Product results.
- Cart.
- Quantity changes.
- Allowed item or transaction discount.
- Stock availability.
- Payment method.
- Financial account.
- Paid amount.
- Change.
- Submit protection.
- Success screen and printable receipt.

### Sales domain

- Sale draft only if needed by UX.
- Server-authoritative totals.
- Sale item snapshots.
- Stock reduction.
- Stock movements.
- COGS.
- Gross profit.
- Sale payments.
- Cash transactions.
- Document number.
- Sale detail and history.
- Controlled cancellation.
- Sales return and refund.
- Optional customer master only if required for the phase.

## Out of scope

- Employee cashier accounts.
- Cashier shifts.
- Customer credit.
- Loyalty.
- Marketplace orders.
- Offline POS.

## Critical rules

- Lock inventory balance during posting.
- Reject insufficient stock.
- Recalculate totals on server.
- Store unit-cost snapshot.
- Store COGS and gross profit.
- Prevent duplicate posting.
- Return references original sale and cannot exceed returnable quantity.
- Refund affects the correct financial account.
- Posted sale is immutable.

## Suggested tables

- customers if included
- sales
- sale_items
- sale_payments
- sale_returns
- sale_return_items

## Required tests

- Barcode/product search authorization.
- Successful cash sale.
- Multiple-item sale.
- Unit conversion sale.
- Discount calculation.
- Insufficient stock.
- COGS snapshot.
- Gross profit.
- Payment and change.
- Duplicate submission.
- Cross-store product/account rejection.
- Sale return.
- Partial return.
- Excess-return rejection.
- Cancellation/reversal.
- Transaction rollback.

## Browser verification

Where available, verify:

- Barcode-to-cart flow.
- Keyboard-friendly checkout.
- Duplicate-click protection.
- Printable receipt.
- Mobile responsive layout.

## Acceptance criteria

- The store can operate a real basic POS.
- Stock, cash, COGS, and gross profit reconcile.
- Returns remain controlled and auditable.
- Tests, browser checks, lint, and build pass.
