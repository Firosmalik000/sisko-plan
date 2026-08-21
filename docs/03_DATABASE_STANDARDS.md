# Database Standards

## Engine and encoding

- MySQL.
- InnoDB.
- utf8mb4.

## Numeric types

- Money: `DECIMAL(19,4)`.
- Quantity: `DECIMAL(18,6)`.
- Conversion factor: suitable decimal type, usually `DECIMAL(18,6)`.

Never use floating point for money.

## Identifiers

- Internal primary keys may use big integers.
- Use a separate public identifier such as UUID or ULID when URLs or external references should not expose sequential IDs.

## Tenant fields

Most operational tables should include `store_id`.

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
- product_variants
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
- supplier_payables or a payable projection, depending on the phase decision

### Support

- document_sequences
- audit_logs
- notifications
- idempotency_keys where needed

## Constraints

Use foreign keys and composite uniqueness.

Examples:

- unique(store_id, sku)
- unique(store_id, barcode)
- unique(store_id, document_number)
- unique(store_id, product_id) on `inventory_balances`

If a cross-table composite foreign key is impractical, enforce the rule through:

- Store-scoped lookup.
- Authorization.
- Validation.
- Tests.
- Database transaction.

## Indexes

Common indexes:

- `(store_id, created_at)`
- `(store_id, transaction_date)`
- `(store_id, status)`
- `(store_id, sku)`
- `(store_id, barcode)`
- `(store_id, document_number)`
- `(store_id, supplier_id)`
- `(store_id, product_id)`

Use real query plans to refine indexes later.

## Document sequences

Document number generation must be concurrency safe.

Use a transaction and row lock for the relevant store, document type, and period.

Examples:

- `SALE-202608-00001`
- `PUR-202608-00001`
- `CAP-202608-00001`
- `EXP-202608-00001`
- `ADJ-202608-00001`

## Balance projections

`inventory_balances` and any stored financial balance are projections for fast reads.

Ledger transactions are the traceable history.

Projection updates must happen atomically with the ledger write.

## Soft deletes

Use soft deletion carefully.

- Master data may be deactivated or soft-deleted when safe.
- Posted transactions must stay auditable.
- Do not use soft delete as a substitute for reversal.
