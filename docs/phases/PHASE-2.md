# Phase 2 - Master Data Produk dan Operasional

## Goal

Memungkinkan anggota toko menyiapkan referensi operasional yang aman dan terisolasi sebelum transaksi stok dan keuangan dimulai.

## Required Outcomes

- Kategori, satuan, produk, supplier, dan akun keuangan dikelola per toko aktif.
- Produk memiliki SKU/barcode unik per toko dan minimal satu satuan dasar.
- Harga beli dan jual disimpan secara decimal-safe per satuan produk.
- Satuan tambahan menggunakan faktor konversi terhadap satuan dasar.
- Master data dinonaktifkan, bukan dihapus, agar aman untuk transaksi fase berikutnya.
- Perubahan harga produk tercatat pada audit log.
- Retry create produk dengan token yang sama tidak membuat data ganda.
- Semua referensi relasional divalidasi melalui toko aktif.
- Daftar menyediakan pencarian, filter status, pagination, empty state, dan UI responsif.

## Scope

- CRUD dan aktivasi/nonaktivasi kategori.
- CRUD dan aktivasi/nonaktivasi satuan.
- CRUD dan aktivasi/nonaktivasi produk beserta konfigurasi satuannya.
- CRUD dan aktivasi/nonaktivasi supplier.
- CRUD dan aktivasi/nonaktivasi akun kas, bank, dan e-wallet.
- Navigasi master data dan automated test tenancy.

## Out of Scope

- Saldo awal akun, transaksi kas, dan transfer.
- Saldo stok, pergerakan stok, dan penyesuaian.
- Pembelian, utang supplier, pelanggan, POS, dan penjualan.
- Import/export massal dan upload gambar produk.

## Acceptance Criteria

- Data toko lain tidak dapat dibaca atau direferensikan melalui request yang dimanipulasi.
- SKU dan barcode dapat kosong tetapi tidak dapat duplikat dalam toko yang sama.
- Satuan dasar selalu memiliki faktor konversi `1`.
- Harga tidak negatif dan disimpan sebagai `DECIMAL(19,4)`.
- User tanpa hak kelola hanya dapat melihat master data.
- Referensi nonaktif tetap dapat dipertahankan oleh produk lama tetapi tidak dapat dipilih untuk produk baru.
- PHPUnit, PHPStan, Pint, ESLint, Prettier, TypeScript, dan production build lulus.
