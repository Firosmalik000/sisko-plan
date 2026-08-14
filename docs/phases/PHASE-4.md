# Phase 4 - Purchasing dan Utang Supplier

## Status

Completed

## Goal

Mencatat pembelian tunai, sebagian, atau kredit secara atomik sehingga stok, kas, dan utang supplier selalu dapat direkonsiliasi.

## Required Outcomes

- Pembelian posted menyimpan snapshot produk, satuan, konversi, harga, dan landed cost.
- Kuantitas pembelian dikonversi ke satuan dasar sebelum masuk inventory.
- Diskon serta biaya tambahan dialokasikan ke item untuk moving weighted average.
- Setiap pembelian menambah stock movement dan kewajiban supplier secara atomik.
- Pembayaran awal atau lanjutan mengurangi kas dan utang supplier secara atomik.
- Pembayaran tidak dapat melebihi sisa tagihan dan saldo kas tidak boleh negatif.
- Pembelian serta pembayaran immutable, idempotent, tenant-scoped, dan bernomor concurrency-safe.
- Histori pembelian serta posisi utang dapat dilihat melalui UI responsif dan pagination.

## Scope

- Purchase header dan item snapshots.
- Cash, partial, dan credit purchase.
- Supplier payable ledger dan balance projection.
- Initial payment dan subsequent purchase payment.
- Purchase history, outstanding status, dan supplier debt summary.

## Out of Scope

- Purchase order, receiving terpisah, approval, dan lampiran invoice.
- Purchase return, cancellation, reversal, supplier credit note, dan aging report formal.
- Supplier overpayment/deposit dan multi-currency.

## Acceptance Criteria

- Stock, cash, payable, dan purchase totals reconcile setelah setiap posting.
- Moving average memakai landed base-unit cost yang dihitung server.
- Cross-store supplier, product, unit, dan account ditolak.
- Duplicate submission tidak membuat purchase/payment ganda.
- Overpayment, backdated posting, saldo kas negatif, dan input melampaui kapasitas decimal ditolak.
- Kegagalan salah satu ledger menggulung seluruh posting.
- PHPUnit, PHPStan, Pint, ESLint, Prettier, TypeScript, dan production build lulus.
