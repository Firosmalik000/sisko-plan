# Phase 3 - Stok, Kas, dan Modal

## Status

Completed on 2026-08-06

## Goal

Menyediakan ledger operasional yang terpisah dan dapat direkonsiliasi untuk stok, kas, dan modal pemilik.

## Required Outcomes

- Setiap perubahan stok menghasilkan stock movement dan memperbarui inventory balance secara atomik.
- Setiap perubahan kas menghasilkan cash transaction dan memperbarui account balance secara atomik.
- Setoran dan penarikan pemilik tercatat sebagai capital transaction, bukan pendapatan atau beban.
- Saldo awal stok dan akun dicatat melalui dokumen posted, bukan perubahan saldo langsung.
- Penilaian persediaan menggunakan moving weighted average yang decimal-safe.
- Saldo stok dan kas tidak dapat menjadi negatif.
- Transfer akun tidak mengubah total kas toko.
- Nomor dokumen berurutan aman terhadap concurrency per toko, tipe, dan periode.
- Retry request dengan idempotency key yang sama tidak membuat posting ganda.
- Idempotency key terikat pada fingerprint payload dan menolak penggunaan ulang untuk request berbeda.
- Posting backdated ditolak agar saldo setelah transaksi dan moving average tetap kronologis.
- Input dan tampilan waktu mengikuti timezone toko, sementara penyimpanan dinormalisasi ke UTC.
- Seluruh histori dapat diakses melalui pagination.
- Dokumen posted immutable dan semua referensi dibatasi ke toko aktif.

## Scope

- Inventory balance, stock movement, opening stock, adjustment, damaged/lost stock, dan minimum-stock status.
- Opening cash, cash ledger, account balance, dan transfer antar-akun.
- Kontribusi serta penarikan modal dalam bentuk kas atau persediaan.
- Riwayat dan ringkasan stok, kas, serta modal untuk owner/admin.

## Out of Scope

- Pembelian, utang supplier, POS, penjualan, retur penjualan, dan beban.
- General ledger formal, jurnal double-entry, laba rugi, dan neraca akuntansi.
- Reversal dokumen posted dan approval bertingkat.

## Acceptance Criteria

- Ledger dan proyeksi saldo stok/kas selalu cocok setelah setiap posting.
- Posting lintas ledger berhasil seluruhnya atau rollback seluruhnya.
- Moving average benar untuk beberapa penerimaan dengan biaya berbeda.
- Negative stock/cash, akun transfer sama, dan referensi lintas toko ditolak.
- Kontribusi kas hanya menambah kas dan modal; kontribusi inventory hanya menambah stok dan modal.
- Penarikan mengurangi aset terkait dan modal, bukan mencatat beban.
- PHPUnit, PHPStan, Pint, ESLint, Prettier, TypeScript, dan production build lulus.
