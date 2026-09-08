# POS payment method synchronization and QRIS proof

## Status

Completed

## Goal

Keep the selected POS payment method valid for the active store and allow a private QRIS payment proof to be attached to the posted sale payment.

## Scope

- Reconcile the POS form account with refreshed payment methods.
- Keep payment-method identifiers (`cash` and `qris`) stable across Indonesian, Malay, and English UI translation.
- Generate cash tender suggestions from the active store currency instead of fixed rupiah denominations.
- Add an optional QRIS proof upload for JPG, PNG, WebP, or PDF files up to 5 MB.
- Store proofs privately on the local disk with server-generated names.
- Expose proofs through an authorized, store-scoped sales route.
- Show the proof action on sale detail without including it in the printed receipt.

## Data and transaction decisions

- Add nullable `payment_proof_path` to `sale_payments` for backward compatibility.
- Include the proof checksum in the idempotency request hash.
- Write the file only after the idempotency check and remove it if the database transaction fails or loses a concurrent idempotency race.
- Reject proof uploads for cash accounts at both the HTTP and domain boundaries.

## Verification

- Focused sales feature tests for QRIS persistence, cash rejection, and tenant-scoped access.
- Pint, ESLint, TypeScript, production build, migration status, responsive browser checks, and final diff review.

## Verification results

- `SalesPosTest` and `LocaleTest`: 36 tests passed with 400 assertions.
- Full Laravel suite: 290 tests passed with 2,663 assertions.
- QRIS proof persistence, private delivery, cash rejection, and cross-store denial passed.
- The UI translation compiler regression check confirms technical `cash` and `qris` values are not translated while rendered payment copy remains localized.
- Currency regression checks confirm MYR 15 suggests RM15, RM20, and RM50, while IDR 15,000 suggests Rp15,000, Rp20,000, and Rp50,000.
- The migration is applied in the local environment and exercised by the test database; the rollback method was reviewed but not run against the shared local database.
- Pint, Prettier, scoped ESLint, the full UI translation audit, repository-wide TypeScript checking, PHP feature tests, and the production build passed.
- Browser verification passed at 320, 375, 640, 768, 1024, 1280, and 1536 px with Cash/Tunai and QRIS visible, no missing-method state, no clipped controls, and no horizontal page overflow.
- QRIS selection exposes a compact proof control and the browser console reported no warnings or errors.
