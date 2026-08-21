# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pengguna utama adalah pemilik usaha ritel kecil yang mengelola toko secara langsung, dapat memiliki lebih dari satu toko, dan membutuhkan sistem yang lebih tertib daripada catatan manual tanpa kompleksitas ERP atau akuntansi penuh.

Anggota toko menggunakan alur operasional sesuai perannya. Operator platform mengelola akun, toko, paket, langganan, batas penggunaan, dukungan teknis, dan audit tanpa menjadi pemilik data operasional tenant.

## Product Purpose

Sisko Plan menyatukan pekerjaan toko sehari-hari dalam satu SaaS multi-toko: master produk, stok, modal, kas, pembelian, POS, biaya, utang supplier, dan laporan operasional sederhana tetapi benar.

Keberhasilan berarti pemilik dapat menjalankan dan memahami kondisi toko dengan lebih cepat, sementara stok, kas, HPP, laba kotor, utang, dan riwayat transaksi tetap dapat direkonsiliasi.

## Positioning

Produk mengutamakan alur ritel praktis dan istilah Indonesia yang mudah dipahami, sambil menjaga ledger, transaksi, otorisasi, dan isolasi antar-toko tetap benar di server. Produk berada di antara catatan manual yang rapuh dan sistem ERP yang terlalu kompleks untuk toko kecil.

## Operating Context

- Pemilik memantau usaha terutama melalui portal responsif di perangkat mobile.
- Kasir membutuhkan POS cepat dengan pencarian, barcode, keranjang, pembayaran, kembalian, dan bukti transaksi.
- Operasional harian mencakup barang masuk, pembelian tunai atau kredit, stok, kas, modal, biaya toko, penjualan, retur, dan laporan.
- Setiap toko merupakan tenant terisolasi dengan anggota, data, dan langganannya sendiri.

## Capabilities and Constraints

- Mendukung banyak toko, anggota berbasis peran, paket, langganan, dan batas penggunaan.
- Mendukung produk, varian, satuan, supplier, akun keuangan, persediaan, pembelian, POS, biaya, modal, kas, retur, serta laporan sederhana.
- Nilai uang dan kuantitas otoritatif dihitung dan divalidasi di server.
- Bukan aplikasi native, bukan POS offline-first, bukan ERP, bukan payroll, dan bukan akuntansi double-entry penuh.
- Antarmuka menggunakan label Indonesia langsung dan tidak mengklaim laporan sebagai hasil audit formal.

## Brand Commitments

- Nama aplikasi saat ini adalah Sisko Plan.
- Antarmuka publik menggunakan tema terang tanpa dark mode.
- Karakter yang diminta: modern, profesional, user-friendly, compact, dan konsisten dengan aplikasi kasir serta operasional toko.
- Logo aplikasi yang sudah ada tetap digunakan.

## Evidence on Hand

- Cakupan dan batas produk: `docs/00_PRODUCT_SCOPE.md`.
- Aturan bahasa dan UX: `docs/06_UI_UX_STANDARDS.md`.
- Keamanan dan isolasi tenant: `docs/04_SECURITY_TENANCY.md`.
- Implementasi nyata dashboard, POS, persediaan, pembelian, laporan, toko, anggota, dan langganan tersedia di repository.
- Belum tersedia testimonial pelanggan, logo pelanggan, angka adopsi, penghargaan, atau klaim komersial terverifikasi; landing tidak boleh memfabrikasinya.

## Product Principles

1. Sederhana bagi pengguna yang tidak memahami istilah akuntansi.
2. Benar dan dapat direkonsiliasi pada ledger serta transaksi.
3. Aman dan terisolasi antar-toko.
4. Cepat untuk pekerjaan operasional yang berulang.
5. Berkembang tanpa kompleksitas spekulatif.

## Accessibility & Inclusion

Antarmuka harus responsif, memiliki label yang jelas, fokus keyboard terlihat, status tidak bergantung pada warna saja, touch target yang nyaman, validasi yang dapat ditindaklanjuti, dan bahasa Indonesia yang mudah dipahami.
