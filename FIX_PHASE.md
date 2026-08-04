# Phase 4 — Purchasing and Supplier Payable

## Goal

Allow stores to record purchases that correctly affect inventory, cash, and supplier payable.

## Dependencies

- Phase 3 ledgers complete.

## Scope

- Purchase draft.
- Purchase item entry.
- Optional allocated acquisition costs.
- Post purchase.
- Payment status: unpaid, partially paid, paid.
- Cash purchase.
- Credit purchase.
- Partial payment.
- Purchase payment history.
- Due date.
- Supplier payable/outstanding amount.
- Purchase return.
- Purchase cancellation/reversal where allowed.
- Purchase detail and printable document.
- Purchase reports required for the module.

## Out of scope

- Purchase requisition.
- RFQ.
- Approval chains.
- Multi-warehouse receipt.
- Three-way matching.
- Full accounts payable accounting.

## Critical rules

- Posting purchase increases inventory.
- Weighted average cost is recalculated.
- Payment decreases selected financial account.
- Unpaid remainder becomes supplier payable.
- Supplier and products must belong to active store.
- Posted purchase is immutable.
- Returns reference the original purchase.
- All effects are atomic.

## Suggested tables

- purchases
- purchase_items
- purchase_payments
- purchase_returns
- purchase_return_items
- payable projection if chosen

## Required tests

- Cash purchase.
- Credit purchase.
- Partial payment.
- Later payment.
- Average-cost change.
- Acquisition-cost allocation.
- Purchase return paid and unpaid cases.
- Overpayment rejection.
- Cross-store supplier/product/account rejection.
- Rollback on failure.
- Concurrent sequence safety.

## Acceptance criteria

- Purchase balances reconcile with stock, cash, and payable.
- Owner can identify unpaid purchases.
- Returns and cancellations remain auditable.
- Tests and builds pass.
