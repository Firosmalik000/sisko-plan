# Customer UI/UX — Keputusan desain dan cakupan

Tanggal: 8 September 2026. Status: spesifikasi desain tetap berlaku; hasil visual implementasi pertama ditolak pengguna. Plan rebuild baru mengunci komposisi prototype, komponen bersama, dan acceptance 25 halaman. Dokumen ini menggantikan discovery sesi lama pada path yang sama. Jangan mengulang discovery dari nol atau menganggap prototype sebagai kontrak kelengkapan fungsi.

## Acuan dan batas

- Customer saja; pemilik dan kasir sama penting. Admin, landing, autentikasi publik tidak dirombak.
- Pertahankan seluruh fungsi, field, validasi, izin, isolasi toko, perhitungan server, dan struktur utama alur existing.
- Mobile-first Android WebView, nyaman di tablet dan desktop PC. Tidak ada sidebar pada ukuran mana pun.
- Brand default `#EE4D2D`, tema per toko tetap tersedia. Latar existing `#FFFAF7 → #FFF3EF`, surface putih, ringkasan/seleksi peach, teks `#2D2928`.
- Inter lokal; tombol utama prototype `#C83C20` + putih untuk kontras. Brand bukan diganti. Tema lain memerlukan pemeriksaan pasangan teks/tombol tersendiri.
- Tidak menyalin kompetitor atau menambahkan dekorasi untuk mengisi ruang.
- Gunakan brainstorming, Impeccable, simplicity-review dan writing-plans sesuai tugas; Laravel Boost untuk konteks, Context7 untuk dokumentasi yang relevan bila tersedia. Jangan Playwright atau GitNexus. Laporkan ketidaktersediaan tool apa adanya.
- Dark mode baru disiapkan melalui token semantik; implementasi/toggle dark mode bukan cakupan tahap ini. Implementasi mobile offline bukan cakupan redesign web ini.

## Keputusan visual dan interaksi

| Bagian | Keputusan |
|---|---|
| Header aplikasi | Ikon toko + nama + chevron sebagai pemilih toko; bahasa, notifikasi, profil jelas. Gambar toko hanya jika datanya memang tersedia; fallback ikon. Dropdown di bawah pemicu, dibatasi viewport, fokus kembali setelah tutup. |
| Navigasi | Beranda, Produk, Kasir, Transaksi, Lainnya di bawah semua ukuran. Kasir tengah menonjol sebagai tombol aksi, bukan active page kedua. Lainnya panel bawah di HP, popup di atas pemicu pada desktop. |
| Header halaman | Judul langsung di latar peach, tanpa card khusus. Judul/tindakan sejajar desktop; tindakan turun baris mobile. Subtitle hanya untuk konteks yang berguna. Tidak menambah breadcrumb global; kembali existing tetap jelas dan tidak berulang. |
| Typography | Inter 400/500/600/700; judul 24px mobile dan 28px desktop, bagian 16–18px, isi 14–16px, input 16px, metadata 13px. Angka tabular. |
| Spacing | Skala 4/8/12/16/24/32px; gutter 16px HP (12px pada 320), 24–32px tablet/desktop. Konten operasional sekitar 1240px, POS dapat 1440px, form sekitar 720px. |
| Surface | Putih untuk tabel/form; peach untuk ringkasan dan seleksi. Radius 12–16px, garis tipis seperlunya untuk membaca data. Shadow ringan hanya lapisan mengambang. Tidak ada nested card dekoratif. |
| Action | Satu prioritas utama per konteks. Kontrol sentuh minimum 44px, focus terlihat. Sekunder tonal lembut; aksi tambahan teks/menu. Status tidak bergantung warna. |
| Form produk | Pertahankan editor modal existing di desktop/tablet; tampil penuh di HP. Bukan migrasi otomatis menjadi route baru. Field dan submit tetap memakai form existing. |
| Modal lainnya | Form singkat/konfirmasi memakai modal, judul jelas, close, area isi scroll, Simpan/Batal tetap terjangkau. Form panjang yang sudah halaman tetap halaman. Jangan modal bertumpuk; kembali dari kamera mengembalikan form dan isian. |
| Daftar | Pencarian/filter dekat data. Nama kiri, angka kanan. Mobile susun atribut penting tanpa menghapus akses informasi lainnya. Tabel dapat scroll lokal saat perbandingan kolom memang dibutuhkan. |
| Pagination | Gunakan komponen dan paginator Laravel existing. Filter/search server-side, query dipertahankan, perubahan filter mereset halaman terkait. Daftar kecil tidak wajib pagination; POS pencarian cepat tidak dipaksa seperti tabel laporan. |
| States | Loading mengikuti bentuk konten; bedakan belum ada data dan pencarian kosong; error dengan pemulihan; validasi di field, isian tidak hilang; sukses memberi hasil yang jelas. |

## Kasir, kamera, dan multi-foto

Pusat Kasir tetap mengakomodasi Penjualan, Pembelian, Cek stok, Tambah produk. Rekomendasi prototype: pilih pekerjaan lalu gunakan manual/scanner alat pada halaman kerja atau tombol Kamera. Kelompok Scan/Tanpa Scan existing tidak boleh dibuang sebelum review kesetaraan akses; jika belum diterima, pertahankan kelompok existing dengan tampilan baru.

Kamera satu ruang dengan mode Foto AI dan Barcode. Barcode tidak memerlukan request AI. Scanner alat bekerja pada input yang tepat tanpa membuka kamera atau mengambil alih input jumlah/harga.

Alur AI: ambil/pilih 3–5 foto contoh → tray yang dapat dihapus → Proses N → progres per foto → pemeriksaan → konfirmasi. Angka 3–5 adalah skenario, bukan batas produk. Batas aktual mengikuti kontrak server dan ukuran file yang diverifikasi.

- Katalog: hasil menjadi draf form existing, termasuk varian/satuan. Nilai belum diketahui tetap kosong; perkiraan ditandai dan dikonfirmasi. Produk existing tidak otomatis dibuat ulang.
- Transaksi: cocokkan dengan katalog toko aktif, koreksi produk/varian/jumlah, lalu masukkan ke keranjang. Tidak otomatis membuat katalog atau memposting transaksi.
- Pembelian: cocokkan ke katalog lalu masukkan ke pekerjaan pembelian existing; supplier, pembayaran, dan utang tetap mengikuti alur bisnis.
- Cek stok: tampilkan persediaan produk cocok; tidak mengubah stok.
- Unknown/ambigu: pilih manual, koreksi atau lewati; jangan menebak kecocokan.
- Duplikat: bedakan foto barang yang sama dari barang tambahan; jangan menjumlahkan otomatis berdasarkan banyak foto.
- Gagal: retry foto gagal saja. Proses ulang/klik ganda tidak menerapkan hasil dua kali. Menambah foto tidak membuang koreksi sebelumnya.
- Menutup, mengganti mode, membuka manual, dan kembali mempertahankan sesi yang belum dibuang. Perubahan toko tidak boleh mencampur sesi/keranjang.

## Bukti kode dan batas audit sebelum implementasi

Diperiksa pada 8 September 2026; ini bukan klaim pengujian perangkat nyata.

- `resources/js/lib/store-theme.ts` menetapkan brand default, background hangat dan surface putih; beberapa halaman memberi gradasi peach sendiri.
- Beranda memakai judul langsung; Produk membungkus judul/kontrol dalam card; Pembelian memakai card header tersendiri. Ada bukti ketidakkonsistenan, bukan hanya selera.
- `app-mobile-layout.tsx` sudah punya dropdown header, tabbar bawah, panel Kasir/Lainnya dan conditional breadcrumb. Layout pengaturan masih perlu diaudit agar tidak memakai sidebar desktop.
- `resources/js/components/pagination.tsx` SUDAH shared, menerima `links` dari paginator. Jangan membuat pagination kedua; warna hardcoded dan ukuran kontrol perlu dirapikan tanpa mengubah admin.
- Produk/Supplier/Kategori dan beberapa ledger/transaksi sudah paginate server-side. Pembelian/langganan memiliki nama parameter halaman masing-masing; jangan diganti seragam menjadi `page`.
- `ProductScanner.tsx`, `CameraViewport.tsx`, `CaptureTray.tsx`, `use-product-scanner.ts`, `use-product-drafts.ts` sudah memuat fondasi kamera, barcode, galeri/antrean. Alur capture katalog/review transaksi belum sama dengan batch eksplisit yang diminta.
- POS memiliki penanganan input barcode; dukungan hardware dan koneksi scanner ke seluruh pekerjaan belum dibuktikan. Layanan AI nyata dan host Android belum diuji.
- Laravel Boost tersedia sebagai dependency dev pada composer.json saat pengecekan terbaru; catatan discovery lama yang menyatakan tidak tersedia sudah tidak menjadi acuan. Ketersediaan MCP tetap diperiksa saat eksekusi.

## Inventaris halaman

Semua path di bawah berada pada `resources/js/pages/customer/`; index/show ditulis ringkas. Komposisi prototype adalah acuan visual. Data contoh dan fungsi simulasinya tidak menggantikan kontrak aplikasi existing; pengecualian dipetakan di plan revisi.

| Halaman kode | Route prototype | Pola |
|---|---|---|
| dashboard | dashboard | Pemantauan dan perhatian |
| master-data/products | products | Daftar + editor + draf multi-foto |
| master-data/categories | categories | Data referensi |
| master-data/units | units | Data referensi |
| master-data/suppliers | suppliers | Data referensi |
| master-data/financial-accounts | accounts | Data referensi |
| pos | pos | Produk + keranjang + pembayaran contoh |
| sales/index | sales | Riwayat dan filter |
| sales/show | sale | Detail/struk |
| sales/return | return | Retur |
| purchasing | purchasing | Pembelian, utang, input |
| expenses | expenses | Biaya dan kategori |
| operations/inventory | inventory | Persediaan dan penyesuaian |
| operations/cash | cash | Kas, saldo awal, transfer |
| operations/capital | capital | Tambah/ambil modal |
| operations/stock-opnames/index | counts | Daftar opname |
| operations/stock-opnames/show | count | Perbandingan sistem/fisik |
| reports | reports | Ringkasan dan perbandingan |
| stores/index | stores | Daftar toko |
| stores/create | store-create | Form |
| stores/show | store | Detail dan anggota |
| settings/profile | profile | Profil + preferensi toko |
| settings/security | security | Keamanan |
| settings/appearance | appearance | Tema |
| subscription | subscription | Paket, kuota, riwayat |

## Kontrak kelengkapan produk

Sumber: `master-data/products/index.tsx`, `ProductForm`, `blankForm`, `blankVariant`.

Field produk: name, description, sku, barcode, category_public_id, retail_unit_public_id, large_unit_public_id, variant_mode, purchase_price, selling_price, current_stock, minimum_stock, variants, photo, remove_photo, is_active. Pertahankan pula _method dan idempotency_key pada pengiriman.

Field varian: client_id, name, purchase_price, selling_price, current_stock, minimum_stock, conversion_factor, sku, barcode, photo, photo_url, remove_photo. Ketentuan field per mode, nilai desimal, upload, kategori/satuan inline, izin dan limit harus tetap mengikuti kode/server; daftar ini tidak menyatakan setiap field editable pada semua keadaan.

Halaman lainnya wajib memperoleh matriks field/action/validation/payload sebelum dimigrasi. Perbedaan prototype tidak mengizinkan pengurangan fitur.

## WebView dan penerimaan

QA lebar 320, 375, 640, 768, 1024, 1280, 1536; portrait/landscape, keyboard/mouse/sentuh, scanner fisik. Tidak boleh overflow halaman, action tertutup tabbar atau modal terpotong.

Host Android memerlukan verifikasi izin kamera, file chooser multiple, safe area/insets, keyboard virtual/visual viewport, Back (tutup lapisan → kembali tahap → history), pause/resume kamera, penghentian stream, sesi setelah proses mati, cetak/unduh/bagikan struk. Belum ada janji offline atau jaminan APK siap hanya dari responsive web. Perilaku setelah proses mati harus dinyatakan jujur bila draft belum persisten.

## Referensi yang sudah dikaji

- [Shopify page layout](https://shopify.dev/docs/api/app-home/latest/web-components/layout-and-structure/page): hierarki judul/action dan lebar berdasarkan pekerjaan.
- [Carbon data table](https://carbondesignsystem.com/components/data-table/usage/): toolbar, pagination, alignment data.
- [Carbon color](https://carbondesignsystem.com/elements/color/usage/): token surface/field dan tema.
- [Shopify POS](https://help.shopify.com/en/manual/sell-in-person/getting-started/smart-grid): akses pekerjaan berulang.
- [Loyverse inventory count](https://help.loyverse.com/help/how-work-inventory-count): pemeriksaan dan koreksi stok.
- [Dribbble POS App](https://dribbble.com/shots/27138912-POS-App-UI-Design): referensi komposisi hangat, bukan bukti usability atau desain untuk disalin.
- [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Inter](https://rsms.me/inter/).
- [Android WebChromeClient](https://developer.android.com/reference/android/webkit/WebChromeClient), [WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview).
- Delapan gambar `docs/asisten-toko/` dipertahankan sebagai bahan audit/pembanding.

## Dokumen aktif

- [Plan implementasi](../superpowers/plans/2026-09-08-customer-ui-redesign.md).
- [Prototype dan batas simulasinya](../design/customer-exploration-v2/BRIEF.md).
- DESIGN.md di root mengatur landing publik; bukan otoritas typography customer.

## Struktur implementasi yang disepakati

Kelompokkan komponen menurut fungsi: ui, page, navigation, forms, store dan fitur product-scanner. Buat folder hanya ketika ada implementasi/konsumen nyata; jangan memindahkan seluruh repo sekaligus. Tidak membuat components/customer atau mesin CRUD generik. Halaman dan layout existing tetap; admin/public dapat memakai komponen umum tanpa mengikuti tema operasional toko. Komponen khusus fitur dan state bisnis tetap dekat fitur. Rincian migrasi path/import ada pada plan implementasi; seluruh konsumen dipindahkan sebelum path lama dihapus, tanpa forwarding file.
