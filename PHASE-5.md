# Phase 5 - Point of Sale, Penjualan, HPP, Laba, dan Retur

## Goal

Menyediakan POS praktis yang mem-posting penjualan dan retur secara atomik sehingga stok, kas, HPP, serta laba kotor selalu dapat direkonsiliasi.

## Scope

- Product search dan barcode-to-cart.
- Cart dengan konversi satuan, diskon item, dan diskon transaksi.
- Cash sale melalui satu financial account, paid amount, dan change.
- Sale/item/payment snapshots, stock reduction, HPP, dan gross profit.
- Histori, detail, serta printable receipt.
- Partial atau full sale return dengan batas returnable quantity dan refund account.
- Full return menjadi controlled cancellation/reversal; posted sale tidak diubah atau dihapus.

## Out of Scope

- Customer credit, loyalty, customer master, split payment, cashier shift, dan offline POS.
- Arbitrary sale cancellation tanpa return ledger.
- Exchange workflow; pertukaran dicatat sebagai return lalu sale baru.

## Critical Rules

- Harga, totals, HPP, laba, dan change dihitung server.
- Stock tidak boleh negatif.
- HPP memakai inventory cost saat sale diposting dan disimpan sebagai snapshot.
- Return harus mereferensikan sale item dan tidak boleh melebihi sisa quantity.
- Refund dan stock restoration terjadi atomik memakai original revenue/COGS proportion.
- Sale dan return immutable, idempotent, tenant-scoped, dan audited.

## Acceptance Criteria

- Sale, payment, stock, COGS, dan gross profit reconcile.
- Partial/full return memulihkan stock dan membalik cash, COGS, serta profit secara terkendali.
- Search/barcode, responsive cart, duplicate protection, dan printable receipt tersedia.
- PHPUnit, PHPStan, Pint, ESLint, Prettier, TypeScript, migration, dan production build lulus.
