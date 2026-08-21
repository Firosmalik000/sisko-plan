# Normalize Product Variants

## Status

Completed

## Goal

Move product variants out of self-referencing product rows into a dedicated
`product_variants` table while preserving every stock and posted transaction
reference.

## Architecture Decisions

- `products` stores catalog-level data only.
- `product_variants` stores variant identity and activity.
- `product_units` stores prices and conversion and optionally points to a variant.
- Operational rows always point to the catalog product and optionally to the
  variant used by the transaction or stock identity.
- Shared-stock variants post inventory against the product with a null variant.
- Separate-stock variants post inventory against the product and variant pair.
- `inventory_balances.stock_key` is a required unique identity used to prevent
  duplicate balances for nullable product/variant combinations on MySQL.

## Database Changes

- Create `product_variants`.
- Add nullable `product_variant_id` to catalog, inventory, purchasing, sales,
  returns, capital, adjustment, and stock-count item tables.
- Backfill all references from legacy child products.
- Delete migrated child product rows.
- Drop `products.parent_product_id`, `products.stock_product_id`,
  `products.variant_name`, and `products.is_inventory_item`.

## Verification

- Fresh migration and rollback on the isolated test database.
- Existing database migration preserves row counts and stock totals.
- Full feature test suite, PHPStan, Pint, TypeScript, ESLint, and production build.

## Verification Results

- MySQL local migration completed in batch 7.
- Preserved 2 catalog products, 6 variants, 6 product units, 3 balances,
  7 stock movements, and 4 sale items.
- Zero orphan variant references and zero duplicate stock keys.
- Confirmed all four legacy product columns were dropped.
- Laravel: 180 tests passed, 1,254 assertions.
- PHPStan on all normalization files: 0 errors.
- TypeScript, ESLint, Vite production build, Pint, and `git diff --check`: passed.
- Responsive verification: not applicable; no frontend markup or styling changed
  in this normalization phase and existing payload shapes were preserved.

## Remaining Risks

- The migration is intentionally irreversible because reconstructing legacy
  child-product rows would make posted variant history ambiguous.
