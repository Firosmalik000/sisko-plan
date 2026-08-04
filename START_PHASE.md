# Phase 2 — Master Data

## Goal

Allow an authorized Owner to prepare all store-specific reference data required by inventory, purchasing, POS, and finance.

## Dependencies

- Phase 1 tenancy and Store Context complete.

## Scope

### Categories

- List, create, update, deactivate.
- Unique naming behavior defined per store.

### Units

- Base units such as pcs, kg, gram, liter, meter.
- Store-owned units.
- Deactivation rather than unsafe deletion.

### Products

- Name.
- Category.
- SKU.
- Optional barcode.
- Base unit.
- Description.
- Minimum stock.
- Active status.
- Optional image.
- Selling-price default.
- Purchase-price reference only; not authoritative inventory cost.

### Product units

- Base unit.
- Optional alternate units.
- Conversion factor.
- Barcode per unit where required.
- Selling price per unit.
- Purchase reference price.

### Suppliers

- Name.
- Phone.
- Email.
- Address.
- Notes.
- Status.

### Financial accounts

- Cash.
- Bank.
- E-wallet.
- Other.
- Default account.
- Status.

### Expense categories

- Store-specific categories.
- Default seed categories may be created.

## Out of scope

- Changing stock.
- Opening stock.
- Purchases.
- POS transactions.
- Cash balances.
- Accounting entries.

## Suggested tables

- categories
- units
- products
- product_units
- suppliers
- financial_accounts
- expense_categories

## Critical rules

- All data store-scoped.
- `unique(store_id, sku)`.
- Barcode uniqueness follows documented store-level rule.
- Product image upload follows security standards.
- Master data used by posted transactions cannot be hard-deleted.
- No stock field is treated as inventory source of truth.

## Required UI

- Searchable, paginated listings.
- Create/edit forms.
- Product detail.
- Product-unit management.
- Active/inactive controls.
- Store switcher remains visible and safe.

## Required tests

- CRUD authorization.
- Cross-store read denial.
- Cross-store relation-reference denial.
- SKU uniqueness per store but allowed across different stores.
- Barcode rule.
- Product upload validation.
- In-use master data cannot be unsafely deleted.
- Financial account belongs to active store.

## Acceptance criteria

- Owner can completely prepare operational master data.
- No inventory or money ledger is changed.
- Tenant isolation is proven.
- Tests, lint, type checks, and build pass.
