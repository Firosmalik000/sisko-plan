# Phase 5 - POS, Sales, COGS, Profit, and Returns

## Status

Completed

## Required Outcomes

- Fast responsive POS with search, barcode entry, cart, payment, and change.
- Server-authoritative item/transaction discounts and totals.
- Atomic stock reduction and cash receipt.
- Per-item inventory cost snapshot, COGS, and gross profit.
- Immutable sale/payment documents with printable detail.
- Partial/full controlled return with refund and stock/cost restoration.
- Tenant isolation, authorization, audit, idempotency, and pagination.

## Scope Decisions

- Stage 1 sales are fully settled through one financial account; customer credit and split payments are deferred.
- Selling price comes from the selected active product unit and cannot be overridden by the browser.
- Return refund and COGS are proportional to the original sale item, with exact remainder on the final return.
- A full return is the supported controlled cancellation mechanism.

## Out of Scope

- Customer accounts, customer debt, loyalty, shifts, offline sync, exchange documents, and arbitrary destructive cancellation.
