# Customer Frontend Rebuild — Implementation Plan

> **For agentic workers:** Gunakan executing-plans. Baca prototype dan kontrak halaman sebelum mengubah kode. Jangan mengulang brainstorming. Plan ini ditulis atas permintaan pengguna untuk memperjelas pekerjaan; penulisan plan tidak memulai implementasi.

**Status:** PLANNED — frontend customer dibangun ulang. Hasil visual implementasi sebelumnya ditolak; tidak dianggap desain final. Belum ada milestone di bawah yang selesai.

**Goal:** Seluruh area customer terasa seperti prototype yang dipilih, konsisten untuk pemilik dan kasir, dengan fungsi existing lengkap pada mobile, tablet, dan desktop.

**Architecture:** Bangun ulang komposisi JSX dan styling customer. Pertahankan Laravel/Inertia, data, useForm, handler, validasi, izin, perhitungan dan endpoint existing. Reuse komponen bernilai, migrasikan semua caller, hapus tampilan yang digantikan. Hasil akhir satu implementasi aktif, bukan versi lama/baru permanen.

**Tech Stack:** Laravel13, React19, Inertia3, TypeScript, Tailwind4, Radix, Lucide. Tidak memerlukan dependency baru.

**Spec:** [Keputusan customer](../../product/PRD-CUSTOMER-UX-DISCOVERY.md). **Acuan visual:** [prototype aktif](../../design/customer-exploration-v2/app.html), `app.js` dan seluruh cascade `style.css` pada direktori yang sama.

## 1. Batas pekerjaan dan prioritas acuan

1. Keputusan eksplisit pengguna: customer saja, brand tetap, tanpa sidebar semua ukuran, mobile-first, fungsi existing lengkap. Layout boleh dibangun ulang.
2. Prototype aktif menjadi acuan komposisi, proporsi, typography, warna, density, bentuk daftar dan lapisan. Bukan sekadar inspirasi warna.
3. Request/controller/form existing menjadi acuan fitur dan data. Angka, tanggal, fitur dan field simulasi prototype tidak disalin menjadi fakta produksi.
4. Pengecualian disepakati: editor produk tetap modal lengkap/fullscreen HP; pusat Kasir mempertahankan Scan/Tanpa Scan dan empat pekerjaan. Jangan menghapus varian atau mengubah transaksi menjadi model sederhana prototype.
5. Admin, public/landing, database, ledger dan auth tidak dirombak. Multi-language dan tema toko tetap. Dark mode penuh/offline/host APK bukan scope; token dan web behavior disiapkan tanpa klaim APK siap.
6. Tidak mereset perubahan existing atau mengubah prototype agar menyerupai implementasi yang salah. Commit/merge/deploy bukan langkah otomatis.

## 2. Bukti masalah yang harus diperbaiki

Audit source sudah menemukan:

- Dashboard mempertahankan CashflowHighlight dan susunan panel lama, padahal prototype memakai strip ringkasan dan kolom konten berbeda.
- Header toko64px vs prototype70/72px; kontrol toko masih ring/shadow, lebar/padding tiap halaman ditentukan wrapper berbeda.
- Breadcrumb muncul sebagai baris global tambahan bila array halaman terisi; ini mengubah tinggi shell antarhalaman.
- Button primitive menerima min44px tetapi tombol/input native masih ada yang h-9. Tombol Bayar POS h-14 dengan orange hardcoded dan shadow sendiri.
- Font customer diarahkan ke Inter, tetapi nomor dokumen memakai font-mono dan weight/size lokal bercampur. Computed font perlu diperiksa di browser; source saja belum membuktikan font yang benar-benar terpakai.
- Operasional menempatkan tab di samping judul; pengaturan memakai kontainer lebar/nav berbingkai. Banyak surface/form lama tetap dominan.
- Empty state dan border/shadow belum mempunyai penerapan bersama yang lengkap.

Audit ini source-based. Browser terakhir tidak menyediakan surface (`apps: [], browsers: []`). Jangan mengaku sudah membandingkan render terbaru. Tes lama292 lulus adalah bukti regresi saat itu, bukan bukti kesesuaian desain.

## 3. Keputusan visual yang dipakai tanpa membuka opsi baru

| Bagian | Aturan final pengerjaan |
|---|---|
| Warna | Brand #EE4D2D; primary action #C83C20 + putih; teks #2D2928; muted #756D6A. Latar hangat #FFFAF7 → #FFF3EF. Surface putih, ringkasan peach. Tema per toko tetap melalui token |
| Font | Inter lokal400/500/600/700 termasuk portal. H1 mobile24/desktop28; h2 18; body14–16; metadata13; input16 pada HP. Angka tabular. Monospace hanya preview printer jika diperlukan, bukan gaya nomor dokumen UI |
| Header toko | Ikon/foto toko jika datanya tersedia + nama + chevron; bahasa/notifikasi/avatar. Desktop72px, mobile70px + safe area. Dropdown header dekat pemicu, target sentuh44px |
| Header halaman | Judul langsung pada background, tanpa card dan tanpa ikon wajib. Subtitle hanya konteks berguna. Action sejajar desktop, turun baris mobile. Satu h1 yang benar |
| Breadcrumb/back | Halaman utama tidak memakai breadcrumb. Detail/edit memakai satu jalan kembali kontekstual di area page header, seperti prototype; jangan sekaligus menambah baris breadcrumb global. Pertahankan destination dan query asal existing. Hierarki lebih dalam hanya memakai breadcrumb bila memberi konteks tambahan nyata |
| Konten | Mengikuti prototype: max1296px termasuk gutter28 desktop; POS max1500; form sekitar740. HP gutter16, pada320 gutter12. Jarak section20–24, header-ke-konten24–28. Satu pemilik gutter, tidak padding ganda |
| Button | Primary/secondary44px minimum, text14 semibold, radius12. Bayar boleh48px sebagai aksi utama. Icon target44, glyph20. Ukuran berbeda harus karena peran jelas, bukan styling halaman sendiri |
| Card/surface | Area data/form putih radius16 tanpa shadow; ringkasan peach tanpa shadow; divider tipis untuk baris data. Shadow lembut hanya modal/dropdown/tabbar mengambang. Tidak nested card dekoratif |
| List/table | Produk/supplier/transaksi memakai baris responsif; desktop kolom sejajar, mobile atribut utama bertingkat. Laporan/mutasi/opname memakai tabel untuk perbandingan; overflow lokal boleh. Informasi/aksi existing tetap bisa diakses |
| Empty state | Dalam area data: ikon sederhana, judul, keterangan opsional, action nyata. Tidak membuat card di dalam card. Kosong awal menawarkan tambah; hasil pencarian kosong menawarkan reset filter |
| Loading/error | Loading tidak menghilangkan draft; validasi dekat field; gagal request menyediakan retry; processing mencegah double submit. Status tidak hanya warna |
| Navigasi | Tabbar bawah Beranda/Produk/Kasir/Transaksi/Lainnya semua ukuran. Desktop floating sekitar740px/bottom16; HP fullwidth+safe area. Kasir tengah menonjol; active state satu tujuan |
| Menu vs modal | Toko/bahasa/profil/notifikasi dropdown. Lainnya mengikuti prototype: popup di atas tabbar desktop, panel bawah mobile—bukan sidebar. Kasir task picker terpisah; modal hanya untuk tugas/konfirmasi yang perlu fokus |

## 4. Komponen dan struktur kode

Buat fondasi sambil langsung memakainya pada halaman nyata, bukan menyelesaikan pustaka komponen tanpa melihat hasil.

| File/lokasi | Tanggung jawab dan keputusan |
|---|---|
| `resources/js/layouts/app/app-mobile-layout.tsx` | Bangun ulang shell/header/tabbar, aturan menu dan safe area. Pertahankan switch toko/bahasa/notifications/auth/permissions existing |
| `resources/css/app.css`, `resources/js/lib/store-theme.ts` | Satu kelompok aturan customer untuk type/control/surface/spacing. Konsolidasi styling yang digantikan, jangan menumpuk override tanpa menghapus sumber lama |
| `components/page/page-header.tsx` | Rebuild title/description/actions. Tambahkan back hanya bersama caller nyata detail. Tidak fetch/query/submit |
| `components/ui/*` | Primitive Button/Input/Select/Dialog/Sheet tetap Radix. Gaya customer juga mencakup kontrol native aktif dan portal, tanpa mengubah default admin |
| `components/store/store-theme-context.tsx` | Pertahankan konteks tema portal. Jangan tambah provider/store global lain tanpa kebutuhan |
| `components/navigation/pagination.tsx` | Satu implementasi links Laravel; query dan aria/disabled tetap. Jangan kembalikan path pagination lama |
| `components/page/empty-state.tsx` (baru saat milestone1) | Pola empty bersama: icon/title/description?/action?. Konsumen pertama Beranda dan Produk; tanpa logika fetch atau branch nama domain |
| `components/reference-data-page.tsx`, `operations-shell.tsx`, `master-data-nav.tsx`, `layouts/settings/layout.tsx` | Rebuild composer existing memakai aturan yang sama. Tab sekunder tidak bersaing dengan page action. Hapus prop yang tidak digunakan setelah migrasi caller |
| `components/product-scanner/*` | Satu implementasi kamera/mode/tray/review. Hook queue existing dipertahankan dan diperiksa, bukan dibuat tandingan |
| `pages/customer/**` | Layout tugas, field, filter, kolom, permission dan submit tetap dekat domain. Produk draft hook tetap di folder produk |

Toolbar/list surface dapat memakai class CSS bersama; jangan membuat wrapper React jika hanya meneruskan children. Form/tabel tidak dijadikan schema CRUD universal. Pecah POS menjadi komponen katalog/keranjang dekat `pages/customer/pos/` hanya bila menyederhanakan tanggung jawab render; parent tetap pemilik tunggal SaleForm dan handler. Tidak menggandakan state untuk mobile/desktop.

## 5. Kasir mobile dan empat input

**HP:** header ringkas → pencarian → Kamera → daftar produk → akses “Keranjang · N barang · total” → bagian keranjang/pembayaran lengkap. Akses keranjang membawa ke bagian kerja existing pada halaman yang sama; tidak menambah route checkout baru. Desktop/tablet yang cukup lebar menampilkan katalog dan keranjang berdampingan; tablet sempit memakai susunan HP. Resize tidak mereset cart.

- Manual: ketik nama/pilih produk; entry manual existing tetap.
- Scanner alat: input fokus menerima barcode+Enter; tidak menyadap pengetikan harga/jumlah atau memerlukan kamera.
- Kamera Barcode: decode barcode, lookup existing; tidak menjalankan AI.
- Foto AI: ambil/pilih beberapa foto → tray tambah/hapus → Proses N → progres/hasil per foto → koreksi → konfirmasi.
- Katalog: hasil menjadi draf form lengkap untuk diperiksa/disimpan. Transaksi: hasil mencocokkan produk/varian katalog lalu masuk keranjang. Tidak membuat katalog atau memposting transaksi otomatis.
- Unknown/ambigu: pilih manual, koreksi, atau lewati. Foto berulang perlu keputusan; jangan dianggap otomatis qty tambahan. Barcode berulang intentional mengikuti qty existing.
- Foto5 dengan satu unknown/satu duplikat menjadi skenario QA, bukan batas hardcoded. Batas jumlah mengikuti config; file hasil normalisasi <=4MB mengikuti request server.
- Koreksi bertahan saat pindah foto/tambah foto/retry. Respons terlambat tidak mencampur sesi/toko. Closing/background menghentikan stream; kembali dari kamera mempertahankan form.
- Jangan menumpuk tabbar, sticky cart, footer Bayar dan keyboard. Awali ringkasan cart dalam alur konten seperti prototype. Kamera menutupi navigasi selama aktif, kembali mengembalikan fokus.
- Native Back/IME/file chooser/permission/pause/resume harus diuji di host Android. Reload/process death belum berarti draf persisten; jangan menjanjikan offline.

## 6. Cakupan seluruh25 halaman

Path relatif `resources/js/pages/customer/`. Semua status awal **belum diterima secara visual**. Kolom terakhir adalah fungsi yang dipertahankan, bukan field demo baru.

| # | Halaman | Fungsi prototype | Target komposisi dan fungsi tetap |
|---|---|---|---|
| 1 | dashboard.tsx | dashboard | Strip metrik sejajar, perhatian stok, kolom grafik/posisi; kategori/top products existing tetap. Periode dan batas akses pemilik/kasir tetap |
| 2 | master-data/products/index.tsx | productPage/productResults/productForm/draftsPage | Toolbar dalam surface, daftar responsif, editor modal lengkap, draf multi-foto |
| 3 | master-data/categories/index.tsx | referencePage | Baris referensi, tambah/edit/status/search/pagination existing |
| 4 | master-data/units/index.tsx | referencePage | Nama/simbol/jenis/status dan seluruh action existing |
| 5 | master-data/suppliers/index.tsx | referencePage | Baris kontak, semua field supplier/filter/pagination |
| 6 | master-data/financial-accounts/index.tsx | referencePage | Nama/jenis/status akun; tidak mengarang saldo dari demo |
| 7 | pos/index.tsx | posPage/posResults/cartBody/payment | Katalog+keranjang desktop; baris produk mobile; diskon/varian/satuan/bukti/pembayaran lengkap |
| 8 | purchasing/index.tsx | purchasing | Ringkasan tersedia, riwayat dan utang; purchase/payment form tetap berbeda |
| 9 | sales/index.tsx | salesPage | Header/action, toolbar, baris nomor/waktu/status/nominal, mode pilih retur |
| 10 | sales/show.tsx | salePage | Detail/struk terukur, total/action jelas, riwayat retur dan cetak tetap |
| 11 | sales/return.tsx | returnPage | Reuse SaleShow, quantity retur/account/waktu/catatan/token tetap |
| 12 | expenses/index.tsx | expensesPage | Toolbar, total, daftar biaya; kategori/form/filter/pagination tetap |
| 13 | operations/inventory.tsx | inventory/inventoryRows | Stok responsif, tabel perbandingan/mutasi tetap; scanner lookup read-only |
| 14 | operations/cash.tsx | cashPage | Saldo akun→riwayat, opening/transfer lengkap |
| 15 | operations/capital.tsx | capitalPage | Riwayat/setor/ambil, mode kas/barang lengkap |
| 16 | operations/stock-opnames/index.tsx | counts | Daftar sesi/status, buat/lanjut dan paginator/izin |
| 17 | operations/stock-opnames/show.tsx | countPage | Header/action→sistem/fisik/selisih, scan/simpan/finalisasi |
| 18 | reports/index.tsx | reports/metric | Filter, penjualan/laba+posisi, tabel terlaris; semua kalkulasi/periode existing |
| 19 | stores/index.tsx | storesPage | Baris toko/aktif/anggota/action; izin pilih/buat tetap |
| 20 | stores/create.tsx | storeForm | Form terpusat; identitas/lokasi/mata uang/validasi tetap |
| 21 | stores/show.tsx | storePage | Identitas+anggota dua kolom desktop; semua setting/peran/tema tetap |
| 22 | settings/profile.tsx | profilePage | Section profil/foto/struk/preferensi/hapus akun, tab horizontal |
| 23 | settings/security.tsx | securityPage | Section password/2FA/passkey; konfirmasi/error existing |
| 24 | settings/appearance.tsx | appearancePage | Akses route appearance jelas; kontrol existing tidak diganti arti menjadi warna toko |
| 25 | subscription/index.tsx | subscriptionPage | Paket/status/kuota/add-on/riwayat/pembayaran; paginator dan limit tetap |

**Adaptasi data yang wajib dicatat:** DashboardProps tidak menyediakan daftar transaksi terbaru atau utang jatuh tempo harian seperti demo. Gunakan metrik/kelompok data existing dengan hierarki visual yang sepadan; jangan menambah angka rekaan/query baru demi menyalin blok demo. Persediaan tidak mendapat endpoint penyesuaian stok baru hanya karena prototype memiliki tombol simulasi. Laporan tidak mendapat export baru bila belum ada implementasinya.

## 7. Kontrak fungsi yang tidak boleh terpangkas

Sebelum mengubah tiap halaman, catat field/action/error key/endpoint/query/izin existing di catatan milestone. Daftar berikut adalah minimum perlindungan, bukan pengganti membaca request.

- Produk: `_method`, idempotency_key, name, description, sku, barcode, category_public_id, retail_unit_public_id, large_unit_public_id, variant_mode, purchase_price, selling_price, current_stock, minimum_stock, variants, photo, remove_photo, is_active; kategori/satuan inline, mode varian, batas paket, dirty close.
- Varian: client_id, name, purchase_price, selling_price, current_stock, minimum_stock, conversion_factor, sku, barcode, photo, photo_url, remove_photo. Pertahankan aturan mode dan serialization existing.
- SaleForm: account_id, transaction_discount_amount, paid_amount, payment_proof, occurred_at, notes, idempotency_key, items beserta opsi produk/varian/satuan/conversion_factor/quantity/discount_amount.
- Purchase: supplier_id, supplier_invoice_number, discount_amount, additional_cost, paid_amount, account_id, occurred_at, notes, idempotency_key, items. Payment utang: purchase_id/account_id/amount/occurred_at/notes/idempotency_key.
- Cash: opening account_id/amount/occurred_at/notes/token; transfer from_account_id/to_account_id/amount/occurred_at/notes/token.
- Capital: type/account_id/amount/items(product_id,quantity,unit_cost)/occurred_at/notes/token. Expenses: category_id/account_id/amount/occurred_at/notes/token, editor kategori.
- ReturnForm: account_id/occurred_at/notes/token/items(sale_item_id,quantity). Jangan menambah field alasan demo sebagai kewajiban baru.
- Pagination: server URLs, ukuran halaman existing, seluruh filter/query dan paginator independen. Search bekerja sebelum pagination, reset filter hanya paginator terkait.
- Tema/multi-language: ID/EN/MS existing termasuk validation/empty/action. Portal mengikuti toko; admin/public memakai default. Permission dan tenancy tetap di server.

## 8. Milestone eksekusi — bukti sebelum menyebarkan pola

### M1 — Fondasi + Beranda + Produk

**Files:** app-mobile-layout, app.css, store-theme, PageHeader, EmptyState, dashboard.tsx, products/index.tsx, portal primitives yang relevan.

- [ ] Catat git status dan data uji; jangan reset perubahan pengguna.
- [ ] Buka prototype8774 dan aplikasi8775; ambil pasangan375/1280 sebelum edit dengan state setara.
- [ ] Bangun shell/header/nav/gutter, kontrol dan surface sesuai bagian3; hapus styling customer yang sudah digantikan.
- [ ] Terapkan ringkasan/kolom Beranda memakai props nyata, termasuk OperationalDashboard untuk kasir.
- [ ] Terapkan daftar Produk dan editor modal semua field; gunakan EmptyState pada Beranda+Produk sehingga shared terbukti punya caller.
- [ ] Periksa header/action/typography/spacing/warna/nav serta produk normal/empty/varian/modal pada375/1280. Perbaiki semua selisih dalam satu putaran, konfirmasi ulang.

**Gate:** hasil aplikasi mengikuti komposisi prototype, bukan hanya warna/font. Jika browser tidak tersedia, jangan mengklaim gate lulus atau menyebarkan desain yang belum terbukti ke seluruh halaman. Catat kebutuhan browser secara konkret; tidak perlu brainstorming baru.

### M2 — Kasir + Pembelian + kamera

**Files:** pos/index.tsx, purchasing/index.tsx, inventory.tsx, product-scanner/*, use-product-drafts.ts.

- [ ] Rebuild katalog/keranjang/pembayaran sesuai bagian5 dengan satu state dan submit existing.
- [ ] Rebuild ringkasan/riwayat/utang Pembelian; seluruh form tetap.
- [ ] Verifikasi manual/scanner alat/barcode kamera/AI; katalog dan transaksi berbeda tujuan; cek stok read-only.
- [ ] Uji5 foto termasuk unknown/duplikat, koreksi→tambah→proses, retry gagal, close/reopen, respons terlambat, alih toko, permission denied dan batas file. Gunakan fake layanan, bukan foto pengguna ke AI nyata.
- [ ] Bandingkan375/768/1280 dan cek keyboard, akses cart, error tidak menghapus isian, processing tidak menggandakan posting.

**Gate:** layout dan interaksi sesuai prototype dengan field existing utuh. Hardware yang belum tersedia ditandai belum diuji.

### M3 — Seluruh halaman lainnya

**Files:** halaman baris3–6 dan9–25, ReferenceDataPage/OperationsShell/SettingsLayout, translations.

- [ ] Migrasi referensi dan transaksi/detail/retur; gunakan pola daftar dan header yang sudah lulus M1.
- [ ] Migrasi biaya/kas/modal/persediaan/opname; tabel perbandingan angka tetap terbaca, tab tidak berdesakan dengan action.
- [ ] Migrasi laporan/toko/pengaturan/langganan; semua akses/field/paginator tetap, judul tidak duplikat.
- [ ] Untuk tiap baris matriks, catat adaptasi data dan field/action/query/izin yang diperiksa. Ambil bukti normal/empty serta form relevan. Jangan tandai halaman selesai karena hanya memakai shell baru.

**Gate:** semua25 halaman punya hasil visual dan pemeriksaan fungsi, tidak ada tampilan lama aktif yang dibiarkan tanpa alasan tercatat.

### M4 — Verifikasi, penghapusan lama, dokumentasi

- [ ] Periksa320/375/640/768/1024/1280/1536 sesuai AGENTS.md: nav/form/table/modal/text/spacing/empty, tanpa page overflow, action terpotong atau tertutup.
- [ ] Periksa ID/EN/MS, nama panjang, angka besar/desimal, keyboard/focus, status, loading/error/retry dan ukuran sentuh.
- [ ] Uji Android/WebView jika host tersedia: permission/file chooser multi-select/safe area/IME/Back/pause-resume/process death/struk. Jangan menganggap responsive sama dengan APK siap.
- [ ] Jalankan quality checks; bandingkan kegagalan lama dan baru. Jangan menyembunyikan error dengan ignore/baseline baru.
- [ ] Review semua class/public API/dependency/representation yang ditambah. Hapus path/style/props yang digantikan setelah semua caller dimigrasi. Tidak membuat compatibility wrapper.
- [ ] Catat status akhir berdasarkan evidence; tidak menyebut selesai jika visual belum diperiksa/ditolak atau ada halaman belum tercakup.

## 9. Verifikasi teknis dan bukti visual

```sh
npm run lint:check
npm run format:check
npm run types:check
npm run i18n:check
npm run build
composer test
php artisan test --compact
git diff --check
```

Focused suite saat behavior berubah:

```sh
php artisan test --filter='MasterDataTest|ProductScannerEndpointTest|SalesPosTest|PurchasingTest|OperationalLedgerTest|StockCountTest|ExpensesReportsTest|StoreTenancyTest|DashboardTest|SubscriptionManagementTest|LocaleTest'
```

Test bermakna: cari produk yang semula halaman2, query next tetap, empty filter pulih, tenant lain tidak bocor; stok lookup tanpa StockMovement; simpan produk/varian dan posting transaksi tidak berubah. Reuse test existing; jangan membuat snapshot kosmetik yang hanya mengulang markup.

Format evidence setiap halaman: `URL | viewport aktual | screenshot prototype | screenshot aplikasi | state | field/action/izin/query diperiksa | adaptasi data | hasil/defect`. Nilai demo berbeda bukan defect; struktur, proporsi, hierarki, surface dan perilaku tetap harus cocok. Source audit tidak menggantikan screenshot.

Tools: Impeccable, executing-plans, simplicity-review; Laravel Boost untuk konteks versi terpasang dan Context7 untuk dokumentasi teknis yang diperlukan. Tidak Playwright/GitNexus. Jangan menginstal alat tambahan tanpa kebutuhan. Tidak perlu riset referensi baru karena desain sudah dipilih.

## 10. Status awal dan definisi selesai

**Belum selesai:** M1/M2/M3/M4 dan visual25 halaman. Implementasi sebelumnya pernah lulus292 tests/2724 assertions dan frontend checks, tetapi ditolak secara visual. Composer test sebelumnya berhenti pada88 error PHPStan; tes PHPUnit dijalankan terpisah. Bukti lama tidak boleh dicatat sebagai hasil rebuild ini.

**Selesai web** hanya jika seluruh25 halaman mengikuti prototype atau punya adaptasi fungsi/data yang jelas, seluruh fungsi existing terakomodasi, shared pattern konsisten, tidak ada implementasi visual lama paralel, quality checks dilaporkan, dan evidence visual tersedia. **Selesai APK** memerlukan pengujian host/perangkat tersendiri.

**Langkah berikutnya setelah plan ini:** M1, bukan merancang ulang arah atau menulis plan tambahan. Pengguna tidak perlu mengulang keputusan warna/font/prototype.
