# Prototype customer — panduan review

Status: eksplorasi desain, 8 September 2026. Prototype aktif menjadi acuan visual untuk rework; hasil aplikasi pertama ditolak karena belum sesuai. Data dan fungsi simulasi bukan kontrak produksi. Status dan pengecualian ada di plan revisi.

- [Keputusan desain, audit, inventaris dan referensi](../../product/PRD-CUSTOMER-UX-DISCOVERY.md)
- [Plan implementasi](../../superpowers/plans/2026-09-08-customer-ui-redesign.md)

Kedua dokumen di atas menjadi acuan; catatan revisi yang saling bertentangan dari sesi lama telah dikonsolidasikan.

## Menjalankan

Dari root repo:

```sh
python3 -m http.server 8774 --bind 127.0.0.1 --directory docs/design/customer-exploration-v2
```

Buka http://127.0.0.1:8774/index.html untuk pengaturan ukuran dan state, atau app.html untuk tampilan penuh. Lebar iframe dibatasi ukuran jendela; pilih 1280 tidak membuktikan desktop jika jendela lebih sempit.

## Yang dapat dicoba

Navigasi seluruh area customer, background peach, Inter lokal, tabbar bawah, dropdown header, modal form singkat, mode Foto AI/Barcode, tray multi-foto, proses dan koreksi hasil contoh. Coba Kas & bank → Saldo awal untuk modal. Kamera/galeri lokal memerlukan izin browser; gunakan Foto contoh untuk simulasi tanpa foto pribadi.

## Batas dan perbedaan yang masih perlu dilengkapi

- Editor produk prototype masih halaman; keputusan implementasi mempertahankan modal existing, fullscreen di HP. Plan Task 4 menyamakan eksplorasi editor sebelum implementasi.
- Contoh field belum mencakup semua validasi/varian/multi-satuan/izin existing. Ketidakadaan di prototype bukan penghapusan fungsi.
- AI dan barcode decode disimulasikan; tidak ada request layanan AI. Transaksi, pembayaran, pengaturan/akun merupakan data contoh.
- Kamera foto dan pilihan galeri bekerja lokal jika tersedia; reload menghapus sesi. Tidak ada janji persistensi/offline.
- Pembelian dan cek stok hasil scan belum membuktikan integrasi penuh; hardware dan APK belum diuji.
- Pemeriksaan terakhir meliputi visual modal mobile/desktop, dropdown toko mobile, sintaks JS dan HTTP 200. Bukan QA menyeluruh 25 halaman.

## Pembersihan dokumen

`docs/design/customer-prototype/` (app.html, index.html, BRIEF.md) dihapus karena eksplorasi lama telah digantikan direktori ini. PRD discovery pada path lama diperbarui menjadi acuan kanonis agar rujukan dokumen lain tetap valid. Dokumen desain/roadmap mobile offline dan plan Boost/parallel tests juga dihapus atas permintaan pengguna karena di luar scope. Gambar docs/asisten-toko dan dokumen landing/public tetap dipertahankan.
