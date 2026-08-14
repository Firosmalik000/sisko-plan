# Phase 4 - Purchasing dan Utang Supplier

## Goal

Mencatat pembelian tunai, sebagian, atau kredit secara atomik sehingga stok, kas, dan utang supplier selalu dapat direkonsiliasi.

## Dependencies

- Phase 1 identity dan multi-store.
- Phase 2 products, product units, suppliers, dan financial accounts.
- Phase 3 inventory, cash ledger, audit, idempotency, dan document sequence.

## Scope

- Purchase header dan immutable item snapshots.
- Konversi satuan pembelian ke base quantity.
- Alokasi diskon serta biaya tambahan sebagai landed inventory cost.
- Cash, partial, dan credit purchase.
- Supplier payable ledger dan lockable balance projection.
- Pembayaran awal dan pembayaran lanjutan.
- Histori pembelian, status outstanding, dan posisi utang supplier.

## Critical Rules

- Total dan landed cost dihitung ulang oleh server.
- Satu posting mengubah purchase, stock, payable, cash, dan audit secara atomik.
- Pembayaran tidak dapat melebihi outstanding atau membuat saldo akun negatif.
- Cross-store references ditolak.
- Posted documents immutable dan idempotent.
- Backdated ledger posting ditolak untuk menjaga projection tetap dapat direkonsiliasi.

## Out of Scope

- Purchase order dan receiving terpisah.
- Purchase return, cancellation, reversal, dan supplier credit note.
- Supplier deposit, multi-currency, lampiran invoice, dan formal aging report.

## Acceptance Criteria

- Moving average memakai landed base-unit cost.
- Stock, cash, purchase, dan supplier payable selalu reconcile.
- Cash, partial, credit, conversion, rollback, idempotency, tenancy, dan authorization memiliki automated tests.
- PHPUnit, PHPStan, Pint, ESLint, Prettier, TypeScript, migration, dan production build lulus.
