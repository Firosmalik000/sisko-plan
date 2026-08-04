# Database Standards

## Engine and encoding

- MySQL
- InnoDB
- utf8mb4

## Numeric types

- Money: `DECIMAL(19,4)`
- Quantity: `DECIMAL(18,6)`
- Conversion factor: suitable `DECIMAL`, normally `DECIMAL(18,6)`

Never use floating point for money.

## Identifiers

Internal relational primary keys may use big integers.

Expose a separate public identifier such as UUID/ULID when URLs or external references should not reveal sequential IDs. Follow the repository's chosen convention consistently.

## Tenant fields

Most operational tables contain `store_id`.

Examples:

- categories
- units
- products
- suppliers
- financial_accounts
- inventory_balances
- stock_movements
- purchases
- sales
- cash_transactions
- capital_transactions
- expenses

## Core tables

### Platform

- platform_admins
- plans
- subscriptions
- subscription_payments
- system_settings
- admin_audit_logs

### Identity and stores

- users
- stores
- store_users
- store_settings

### Catalog

- categories
- units
- products
- product_units

### Inventory

- inventory_balances
- stock_movements
- stock_adjustments
- stock_adjustment_items

### Purchasing

- suppliers
- purchases
- purchase_items
- purchase_payments
- purchase_returns
- purchase_return_items

### Sales and POS

- customers
- sales
- sale_items
- sale_payments
- sale_returns
- sale_return_items

### Finance

- financial_accounts
- cash_transactions
- account_transfers
- capital_transactions
- capital_transaction_items
- expense_categories
- expenses
- supplier_payables or payable projection, according to implementation decision

### Support

- document_sequences
- audit_logs
- notifications
- idempotency_keys where needed

## Constraints

Use foreign keys and composite uniqueness.

Examples:

```text
unique(store_id, sku)
unique(store_id, barcode)
unique(store_id, document_number)
unique(store_id, product_id) on inventory_balances
```

Ensure a child transaction cannot reference a product, supplier, account, or customer from another store.

Where cross-table composite foreign keys are impractical, enforce the invariant through:

- Store-scoped lookup.
- Authorization.
- Validation.
- Tests.
- Database transaction.

## Indexes

Common indexes:

```text
(store_id, created_at)
(store_id, transaction_date)
(store_id, status)
(store_id, sku)
(store_id, barcode)
(store_id, document_number)
(store_id, supplier_id)
(store_id, product_id)
```

Use actual query plans to refine indexes later.

## Document sequences

Document-number generation must be concurrency safe.

Use a database transaction and row lock for the relevant store, document type, and period.

Examples:

- `SALE-202608-00001`
- `PUR-202608-00001`
- `CAP-202608-00001`
- `EXP-202608-00001`
- `ADJ-202608-00001`

## Balance projections

`inventory_balances` and any stored financial balance are projections for fast reads.

Ledger transactions are the traceable history.

Updates to ledger and projection must happen atomically.

## Soft deletes

Use soft deletion carefully.

- Master data may be deactivated or soft-deleted when safe.
- Posted transactions must remain auditable.
- Never use soft delete as a substitute for reversal.
