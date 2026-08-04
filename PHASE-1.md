# Phase 3 — Inventory, Cash, and Capital Ledgers

## Goal

Build the core ledgers and opening-balance workflows that distinguish stock, cash, and owner capital correctly.

## Dependencies

- Phase 2 master data complete.

## Scope

### Inventory

- Inventory balance projection.
- Stock movement ledger.
- Opening stock.
- Stock adjustment.
- Damaged/lost reasons.
- Minimum-stock status.
- Moving weighted average cost service.

### Financial accounts

- Opening cash/bank/e-wallet balance.
- Cash transaction ledger.
- Account balance projection or reliable aggregation.
- Account transfer.

### Capital

- Cash capital contribution.
- Inventory capital contribution.
- Cash owner withdrawal.
- Inventory owner withdrawal if included safely.
- Capital transaction history.

### Document numbering

- Concurrency-safe numbers for capital and adjustment documents.

## Out of scope

- Supplier purchases.
- POS sales.
- Operating expenses except opening setup.
- Formal accounting journals.

## Critical rules

- Every stock change creates stock movement.
- Every cash change creates cash transaction.
- Every owner contribution/withdrawal creates capital transaction.
- Multi-record workflows are atomic.
- Moving-average calculations use decimal-safe arithmetic.
- Negative stock is rejected.
- Posted records are immutable.

## Suggested tables

- inventory_balances
- stock_movements
- stock_adjustments
- stock_adjustment_items
- cash_transactions
- account_transfers
- capital_transactions
- capital_transaction_items
- document_sequences
- idempotency_keys where required

## Required tests

- Opening stock.
- Cash capital contribution.
- Inventory capital contribution.
- Cash withdrawal.
- Account transfer does not change total cash.
- Stock adjustment.
- Negative stock rejection.
- Moving-average cost.
- Duplicate submission protection.
- Rollback on injected failure.
- Cross-store product/account rejection.

## Acceptance criteria

- Stock, cash, and capital reconcile independently.
- No partial ledger state can remain after failure.
- Owner can see balances and histories.
- Tests and builds pass.
