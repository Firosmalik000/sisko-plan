# PRD — XSISTEN Flutter POS

Status: Draft untuk review produk
Tanggal: 11 September 2026
Pemilik produk: XSISTEN
Target implementasi: Kiro
Backend: repository `sisko-plan`
Intelligence: repository `intelligence-service`

## 1. Ringkasan keputusan

XSISTEN Flutter POS adalah aplikasi Android dan iOS gratis untuk pemilik dan staf toko. Aplikasi memprioritaskan transaksi kasir yang cepat, kamera/barcode/AI scan, pengelolaan produk, sinkronisasi offline, notifikasi, dan pencetakan struk.

Flutter adalah client baru. Laravel `sisko-plan` tetap menjadi backend dan database utama. Flutter tidak boleh mengakses database atau `intelligence-service` secara langsung. Business rule, tenancy, harga, stok, kuota AI, ledger, audit, dan nomor dokumen tetap otoritatif di `sisko-plan`.

Rilis pertama bukan prototype atau aplikasi sementara. Rilis ini harus production-ready untuk POS merchant, sekaligus menyediakan katalog distributor perusahaan XSISTEN yang server-driven dan read-only. Checkout distributor, komisi, pembayaran, fulfillment, retur distributor, dan settlement belum dibuat sampai ada workflow nyata.

Prinsip skalabilitasnya adalah boundary domain yang benar, kontrak API versioned, public ID, idempotency, dan migrasi yang aman—bukan membuat semua fitur masa depan atau abstraction generik sejak awal.

## 2. Latar belakang dan peluang

`sisko-plan` saat ini sudah memiliki domain penting: user, multi-store, membership `owner/admin/cashier`, produk dan varian, inventory ledger, penjualan, pembayaran, supplier lokal, country/currency, notifikasi stok, subscription, kuota scan AI, dan integrasi `intelligence-service`.

Namun UI saat ini berbasis Laravel/Inertia web dan autentikasi session. Aplikasi Flutter membutuhkan:

- API mobile first-party yang stabil dan versioned;
- autentikasi per perangkat;
- database lokal dan sinkronisasi offline;
- integrasi native kamera, notifikasi, dan printer;
- UI adaptif Android/iOS;
- design system XSISTEN dengan light, dark, dan warna toko;
- kontrak yang tidak memakai istilah portal lama `Customer` sebagai nama domain.

Nama folder `app/Http/Controllers/Customer` tetap boleh dipertahankan untuk portal web. Tidak perlu refactor besar hanya untuk mengganti nama. API Flutter baru menggunakan bahasa domain seperti `Auth`, `Stores`, `Catalog`, `Sales`, `Sync`, `Scanner`, dan `Distribution`.

## 3. Visi produk dan model bisnis

### 3.1 Visi

Membuat operasional toko terasa cepat dan dapat dipercaya, bahkan ketika koneksi buruk: merchant dapat mencari atau memindai barang, menyelesaikan penjualan, mencetak struk, dan melihat status sinkronisasi tanpa memahami istilah teknis atau akuntansi.

### 3.2 Posisi komersial

- Operasional POS dasar gratis tanpa batas waktu.
- POS manual, barcode, stok, transaksi, dan pencetakan tidak boleh terkunci ketika kuota AI habis.
- Monetisasi awal berasal dari kapasitas AI tambahan, bukan memblokir pekerjaan toko.
- Monetisasi lanjutan dapat berasal dari promosi produk yang transparan, gift/reward, layanan distributor, dan komisi transaksi setelah marketplace benar-benar dibangun.
- UI tidak menggunakan countdown trial, scare copy, atau pola yang membuat aplikasi gratis terasa seperti jebakan berbayar.
- Semua sponsored content wajib berlabel `Promosi` atau `Disponsori` dan tidak menyamar sebagai alert operasional.

## 4. Sasaran dan ukuran keberhasilan

### 4.1 Sasaran produk

1. Kasir baru dapat menyelesaikan penjualan pertama tanpa pelatihan formal.
2. Penjualan tetap dapat dibuat saat internet tidak tersedia dan tersinkron tanpa duplikasi.
3. Barcode dan AI scan mempercepat input, tetapi tidak menjadi single point of failure.
4. Owner dapat membedakan data lokal, tersinkron, gagal, dan membutuhkan perhatian.
5. Satu codebase dapat dipublikasikan ke Google Play dan Apple App Store.
6. Katalog distributor XSISTEN dapat diperbarui tanpa rilis aplikasi baru.

### 4.2 Product metrics

- Persentase transaksi berhasil diselesaikan.
- Median waktu dari buka Kasir sampai transaksi selesai.
- Persentase transaksi offline yang berhasil tersinkron tanpa tindakan manual.
- Duplicate sale rate berdasarkan `client_operation_id` harus nol.
- Crash-free sessions dan ANR-free sessions.
- Camera-to-result latency dan recognition success/uncertain/unknown rate.
- Print success rate per transport dan model printer.
- Rasio merchant yang kembali menggunakan POS pada hari ke-7 dan ke-30.
- Promosi: impression, detail view, dan contact intent; tidak mencampur metrik tersebut dengan transaksi POS.

Target angka numerik ditentukan setelah baseline pilot; PRD tidak memfabrikasi SLA bisnis sebelum pengukuran perangkat dan server nyata.

## 5. Pengguna dan otorisasi

### 5.1 Role aktif

| Role | Kemampuan utama |
|---|---|
| Owner | Semua operasional toko, anggota, tampilan, printer, laporan, dan penyelesaian konflik sync |
| Admin toko | Operasional dan konfigurasi yang diberikan owner; tidak dapat mengambil alih kepemilikan |
| Cashier | POS, scan, pembayaran, reprint sesuai izin; tidak dapat mengubah pengaturan sensitif |
| Platform admin | Tetap menggunakan portal web; tidak menjadi navigasi aplikasi merchant |

Satu user dapat menjadi anggota beberapa toko dengan role berbeda. Setiap request wajib membawa store context eksplisit dan server harus memverifikasi membership aktif. Menyembunyikan menu di Flutter bukan authorization.

### 5.2 Role masa depan

Distributor tidak menjadi role pada `store_memberships`. Saat workflow distributor dibangun, distributor menjadi organisasi platform dengan membership sendiri seperti owner, sales, dan fulfillment staff. Pemisahan ini mencegah supplier privat toko bercampur dengan distributor platform.

## 6. Scope rilis pertama

### 6.1 In scope

- Login/logout dan manajemen session perangkat.
- Pemilihan toko dan pemulihan toko aktif terakhir.
- Bootstrap data toko untuk penggunaan offline.
- POS: pencarian, barcode, AI photo recognition, keranjang, diskon yang diizinkan, pembayaran, kembalian, penyimpanan, struk, dan reprint.
- Daftar produk, detail, tambah/edit produk sesuai permission, stok ringkas, dan sinkronisasi perubahan.
- Riwayat penjualan dan detail status sync.
- Offline read untuk katalog lokal dan offline write untuk penjualan.
- Background/foreground sync dengan state yang terlihat.
- Kuota AI dan notifikasi mendekati/habis kuota.
- Push notification dan notification center.
- Kamera native dan lifecycle yang benar.
- Printer LAN, Android Bluetooth Classic/USB pada hardware yang lolos matrix, serta jalur iOS yang didukung platform/vendor.
- Bahasa negara Asia Tenggara dan currency per toko.
- Light/dark/system theme dan custom store accent yang aman.
- Katalog distributor perusahaan XSISTEN yang server-driven, cacheable, read-only, dan transparan bila promosi.
- Profil pengguna: nama dan email; profil toko: nama, alamat, negara, currency, timezone, telepon, logo, dan header/footer struk.
- Build signing, privacy disclosure, permission copy, dan store-readiness Android/iOS.

### 6.2 Out of scope

- Checkout atau pembayaran distributor.
- Komisi, settlement, fulfillment, tracking kurir, dan retur distributor.
- Marketplace konsumen seperti GoMart.
- Menyatukan tabel produk merchant dan katalog distributor.
- Akses langsung Flutter ke `intelligence-service`.
- Full ERP, payroll, atau double-entry accounting baru.
- Web/Desktop Flutter.
- Arbitrary layout builder, custom font upload, plugin marketplace, atau white-label binary per merchant.
- Migrasi besar folder `Customer` lama tanpa kebutuhan perilaku.

## 7. Information architecture

Top-level destination:

1. **Beranda** — ringkasan hari ini, pekerjaan tertunda, sync health, dan kuota AI.
2. **Produk** — katalog merchant, stok, barcode, tambah/edit.
3. **Kasir** — pencarian/scan, keranjang, pembayaran, dan struk.
4. **Katalog** — produk distributor XSISTEN dan promosi transparan.
5. **Lainnya** — transaksi, notifikasi, printer, toko/anggota, tampilan, bahasa, profil, dan bantuan.

Android menggunakan Material 3 `NavigationBar`/`NavigationRail` sesuai lebar. iOS menggunakan tab navigation yang mengikuti konvensi platform. Kasir adalah destination nyata, bukan floating center button dekoratif.

## 8. Alur utama

### 8.1 First launch dan login

1. Aplikasi memilih locale dari perangkat dan menyediakan penggantian bahasa.
2. Pengguna login saat online menggunakan email/password atau Google. iOS juga menyediakan Sign in with Apple sebagai opsi setara agar sesuai kebijakan App Store untuk aplikasi yang menawarkan third-party login.
3. Server menerbitkan token per perangkat, device ID, kemampuan user, daftar toko, dan offline authorization expiry.
4. Jika user memiliki satu toko, aplikasi memilihnya otomatis. Jika lebih dari satu, tampilkan store picker.
5. Bootstrap pertama mengunduh data minimum dan menunjukkan progress yang spesifik.
6. Setelah pernah berhasil bootstrap, pengguna dapat membuka cached workspace saat offline sampai offline authorization lease berakhir.

### 8.2 Penjualan manual/barcode

1. Kasir membuka Kasir; input pencarian siap digunakan.
2. Produk dapat ditemukan lewat nama, SKU, barcode kamera, atau scanner fisik keyboard-wedge.
3. Produk masuk keranjang dengan unit, quantity, harga, dan diskon yang terlihat.
4. Kasir memilih akun penerimaan dan metode pembayaran.
5. Aplikasi menghitung preview lokal memakai decimal-safe arithmetic; server tetap menghitung ulang saat sync.
6. Saat submit, sale disimpan atomically ke local database bersama outbox command.
7. UI langsung menampilkan sukses lokal dan status `Menunggu sinkronisasi` bila offline.
8. Struk dapat dicetak dengan label status lokal bila belum mendapat nomor dokumen server. Setelah sync, nomor server disimpan dan reprint menampilkan nomor final.

### 8.3 AI photo scan

1. Aplikasi menampilkan sisa kuota sebelum kamera dibuka.
2. User memberi izin kamera just-in-time dengan alasan yang jelas.
3. Foto dikompresi/orientasikan di perangkat sesuai kontrak Intelligence.
4. Upload hanya dilakukan saat online. Foto yang belum terkirim dapat menjadi draft lokal; AI tidak diklaim bekerja offline.
5. Request dikirim melalui `sisko-plan`, bukan langsung ke Intelligence.
6. `found` dapat disarankan; `uncertain` wajib dipilih user; `unknown` menawarkan pencarian/manual entry.
7. Harga, stok, status aktif, dan permission dihydrate ulang dari database `sisko-plan` sebelum dimasukkan ke transaksi.
8. Retry memakai logical request ID yang sama agar kuota tidak terpotong dua kali.

### 8.4 Katalog distributor

1. Katalog berasal dari endpoint server dan tersedia dari cache saat offline.
2. Merchant dapat mencari, memfilter, melihat detail, menyimpan produk, atau menghubungi distributor melalui CTA yang dikonfigurasi server.
3. Harga diberi label indikatif bila belum menjadi penawaran transaksional.
4. Sponsored placement selalu memiliki label yang dapat dibaca screen reader.
5. Tidak ada tombol `Beli` sebelum order, payment, fulfillment, cancellation, dan refund benar-benar tersedia.

## 9. Offline-first dan sinkronisasi

### 9.1 Prinsip

- Local SQL adalah source of truth untuk UI Flutter.
- Laravel/MySQL adalah source of truth lintas perangkat dan business ledger.
- Redis bukan database transaksi; Redis hanya untuk cache, distributed lock, rate limiting, dan queue.
- Connectivity signal hanya hint. Setiap network request tetap harus menangani timeout/failure.
- Sync terjadi saat app foreground, setelah write lokal, ketika koneksi pulih, manual retry, push invalidation, dan background opportunity yang diberikan OS.
- iOS tidak menjamin background execution; aplikasi tidak boleh bergantung pada background sync untuk correctness.

### 9.2 Local entities minimum

- `local_user`
- `local_stores`
- `local_memberships`
- `local_store_preferences`
- `local_product_units`
- `local_inventory_summaries`
- `local_financial_accounts`
- `local_sales`
- `local_sale_items`
- `local_notifications`
- `local_distribution_items`
- `sync_outbox`
- `sync_cursors`
- `sync_conflicts`

Token autentikasi tidak disimpan di SQLite; gunakan secure storage platform. Data lokal dipisahkan secara eksplisit per user/store dan dibersihkan saat logout sesuai kebijakan data.

### 9.3 Outbox state

`pending → syncing → synced` atau `pending/syncing → needs_attention`.

Setiap command memiliki:

- `client_operation_id` UUID;
- `device_id`;
- `store_public_id`;
- `operation_type`;
- canonical payload;
- payload hash;
- local timestamps;
- attempt count dan next retry time;
- last structured error.

Satu `client_operation_id` dengan payload sama harus mengembalikan hasil sama. ID sama dengan payload berbeda menghasilkan `409 IDEMPOTENCY_CONFLICT`.

### 9.4 Konflik penjualan

- Penjualan yang sudah diterima server immutable; koreksi menggunakan retur/reversal yang telah disediakan domain.
- Harga server saat sale dibuat tetap otoritatif. Offline sale membawa catalog revision dan local price snapshot untuk audit.
- Jika harga berubah setelah katalog terakhir disinkronkan, server tidak boleh diam-diam mengubah jumlah yang sudah dibayar pelanggan. Sale menjadi `needs_attention`; owner dapat menerima snapshot harga lokal atau membatalkan/reversal sesuai audit policy. Keputusan owner kemudian diposting melalui Action yang sama dengan harga, alasan, actor, dan revision yang tercatat.
- Produk nonaktif/hilang, membership dicabut, akun pembayaran nonaktif, atau payload tidak valid menjadi `needs_attention`; aplikasi tidak membuat produk/stok bayangan diam-diam.
- Timestamp transaksi asli dan posting server keduanya disimpan. Ledger dapat memakai alignment yang sudah tersedia agar urutan ledger konsisten.

### 9.5 Offline authorization

Server mengirim signed/configurable offline lease setelah bootstrap. Default produk: 72 jam sejak validasi permission terakhir. Setelah lease berakhir, cached data tetap dapat dilihat tetapi write sensitif baru memerlukan koneksi. Nilai ini harus configurable dan diaudit pada pilot, bukan hardcoded tersebar di client.

## 10. Kontrak API `sisko-plan`

Prefix: `/api/v1`. JSON memakai `snake_case`, waktu ISO-8601 dengan offset/UTC, dan public ULID/UUID. Internal integer ID tidak diekspos sebagai identifier utama.

Envelope sukses:

```json
{
  "data": {},
  "meta": { "request_id": "..." }
}
```

Envelope gagal:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Pesan aman untuk pengguna",
    "fields": {},
    "retryable": false
  },
  "meta": { "request_id": "..." }
}
```

### 10.1 Endpoint minimum

| Method | Endpoint | Tujuan |
|---|---|---|
| POST | `/auth/tokens` | Login dan token perangkat |
| POST | `/auth/social/google` | Verifikasi credential Google dan terbitkan token perangkat |
| POST | `/auth/social/apple` | Verifikasi credential Apple dan terbitkan token perangkat |
| DELETE | `/auth/tokens/current` | Logout/revoke perangkat |
| GET | `/me` | User dan capability ringkas |
| GET | `/stores` | Membership dan toko yang dapat diakses |
| GET | `/stores/{store}/bootstrap` | Snapshot minimum + cursor + offline lease |
| GET | `/stores/{store}/sync/pull?cursor=` | Delta changes, tombstone, cursor berikutnya |
| POST | `/stores/{store}/sync/push` | Batch command idempotent dengan hasil per command |
| GET | `/stores/{store}/products` | Query/pagination saat online |
| POST/PATCH | `/stores/{store}/products...` | Mutasi produk sesuai permission |
| POST | `/stores/{store}/sales` | Online/direct sale menggunakan `PostSale` |
| GET | `/stores/{store}/sales` | Riwayat paginated |
| GET | `/stores/{store}/sales/{sale}` | Detail/reprint |
| GET | `/stores/{store}/scanner/quota` | Usage, limit, remaining, reset time |
| POST | `/stores/{store}/scanner/recognitions` | Proxy recognition |
| POST | `/stores/{store}/scanner/discoveries` | Proxy product discovery |
| GET | `/stores/{store}/notifications` | Notification center |
| POST | `/devices` | Registrasi/update FCM/APNs token |
| DELETE | `/devices/{device}` | Revoke device token |
| GET | `/distribution/catalog` | Katalog distributor/promosi, market-aware |
| GET | `/distribution/catalog/{item}` | Detail produk distributor |

`sync/push` tidak menjadi generic RPC untuk semua domain. Rilis pertama hanya menerima operation type yang benar-benar didukung, dimulai dari `sale.create`; operation baru ditambah bersama validator, authorization, action, dan test masing-masing.

### 10.2 Reuse backend wajib

- API controller tetap tipis.
- Gunakan `PostSale`, `SaleCalculator`, inventory/cash ledger, `IdempotencyGuard`, document sequence, dan `ScanQuota` yang sudah ada.
- Jangan membuat business logic Flutter-specific yang berbeda dari web.
- Gunakan Laravel API Resource untuk serialization dan Form Request untuk validation.
- Semua query store-scoped dan diuji terhadap cross-tenant access.
- Authentication mobile menggunakan token first-party per device; pilihan paket token dikunci setelah review dokumentasi versi Laravel yang terpasang. Jangan membuat token table/crypto custom bila paket resmi memenuhi kebutuhan.
- Social credential diverifikasi oleh `sisko-plan`; Flutter tidak mempercayai email/nama dari client sebagai bukti identitas.
- Gunakan satu representasi `user_social_identities` dengan unique `(provider, provider_subject)` untuk Google dan Apple. Migrasikan pemakaian aktif `users.google_id`, lalu hapus kolom lama setelah semua caller berpindah; jangan mempertahankan dua representasi paralel.
- Account linking harus eksplisit dan mencegah takeover: provider subject adalah kunci, email wajib terverifikasi, dan collision meminta user login ke akun yang sudah ada.

## 11. Katalog distributor dan promosi

Katalog tidak di-hardcode di Flutter. Minimum model server:

### `distribution_partners`

- public ID;
- nama/legal name;
- logo dan kontak;
- status;
- service markets;
- disclosure/label partner.

### `distribution_catalog_items`

- public ID dan partner ID;
- SKU partner;
- nama/deskripsi/gambar;
- unit penjualan dan minimum quantity;
- indicative price amount + ISO currency;
- availability/status;
- market/region targeting;
- valid from/until;
- timestamps.

### `promotion_campaigns`

- public ID;
- partner/catalog item;
- placement yang diizinkan;
- localized copy;
- active window;
- market targeting;
- disclosure label;
- priority yang dibatasi;
- status.

Perusahaan XSISTEN dibuat melalui seeder/admin platform sebagai partner pertama. Nilai produk, harga, dan kampanye berada di database/object storage, bukan constant atau asset release Flutter.

Boundary backend berada pada:

```text
app/Http/Controllers/Api/V1/Distribution/
app/Http/Resources/Api/V1/Distribution/
app/Actions/Distribution/        # hanya ketika ada perilaku, bukan CRUD pass-through
app/Models/DistributionPartner.php
app/Models/DistributionCatalogItem.php
app/Models/PromotionCampaign.php
```

Jangan menaruhnya di `Controllers/Customer` atau `Actions/Sales`. Merchant membaca katalog distributor, tetapi katalog tersebut bukan milik satu store.

Belum membuat `orders`, `commissions`, atau `settlements`. Ketika checkout dibangun, order wajib menyimpan merchant store, distributor, item/price snapshots, currency, fulfillment state, payment state, dan immutable commission ledger. Ini extension direction, bukan schema kosong pada rilis ini.

## 12. Arsitektur Flutter

### 12.1 Pendekatan

Gunakan feature-first MVVM pragmatis:

- View: rendering dan user interaction.
- ViewModel/Notifier: screen state dan orchestration.
- Repository: canonical access ke local/remote data.
- Service: HTTP, database, secure storage, camera, notification, printer.
- Domain/use-case hanya untuk aturan lintas repository atau operasi kompleks; jangan membuat satu use-case untuk setiap getter/setter.

### 12.2 Nama dan batas repository aplikasi

Repository Flutter sebaiknya bernama produk, misalnya `xsisten-app`, bukan `xsisten-pos`. Rilis pertama memang berpusat pada POS, tetapi root aplikasi mewakili XSISTEN dan dapat menampung workspace merchant/distributor di masa depan.

- Sekarang: merchant shell dengan feature `pos`, `products`, `scanner`, dan `distribution_catalog`.
- Nanti: tambahkan `distributor_workspace` hanya ketika workflow menerima order benar-benar dibangun.
- Satu user dapat memilih workspace berdasarkan membership/capability dari server; jangan menentukan role dari nama route atau hardcode aplikasi.
- Jangan membuat folder distributor kosong sekarang.
- Jika kelak distributor memerlukan binary, branding, dan release lifecycle berbeda, barulah ekstrak package bersama berdasarkan duplikasi nyata. Jangan memulai monorepo multi-app spekulatif.

### 12.3 Struktur folder

```text
lib/
  app/
    app.dart
    router.dart
    bootstrap.dart
  core/
    config/
    errors/
    localization/
    logging/
    network/
    persistence/
    theme/
  features/
    auth/
      data/
      presentation/
    stores/
      data/
      presentation/
    home/
      presentation/
    products/
      data/
      domain/
      presentation/
    pos/
      data/
      domain/
      presentation/
    scanner/
      data/
      presentation/
    sync/
      data/
      domain/
      presentation/
    printing/
      data/
      domain/
      presentation/
    notifications/
      data/
      presentation/
    distribution_catalog/
      data/
      presentation/
    settings/
      data/
      presentation/
  shared/
    ui/
test/
integration_test/
```

Tidak semua feature wajib memiliki semua folder. `shared` hanya menampung primitive/design token atau komponen yang benar-benar dipakai lintas feature. Hindari `BaseRepository`, `BaseService`, service locator global, barrel file besar, dan wrapper yang hanya meneruskan method.

Future placement ketika distributor workspace aktif:

```text
lib/features/
  distributor_workspace/
    orders/
    catalog_management/
    fulfillment/
```

Folder tersebut bukan bagian rilis pertama dan tidak dibuat sebagai placeholder.

### 12.4 Dependency rules

- Presentation boleh bergantung pada domain/data contract feature-nya.
- Repository menjadi satu-satunya jalur mutasi data aplikasi.
- Feature tidak mengimpor internal presentation feature lain.
- Native/plugin integration berada di service/adapter yang memiliki alasan boundary nyata.
- Model API, row database, dan model UI tidak dipaksa menjadi satu object jika lifecycle-nya berbeda; mapping dibuat hanya di boundary tersebut.

## 13. Paket Flutter

Versi berikut adalah baseline yang diverifikasi 11 September 2026; Kiro harus memilih versi stable yang kompatibel dengan Flutter SDK yang dipin dan mengunci hasilnya di `pubspec.lock`.

| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| State/DI | `flutter_riverpod` | Async state dan testability; hindari provider global tanpa scope |
| Routing | `go_router` | Deep link, auth redirect, nested shell |
| Local SQL | `drift` + `drift_flutter` | Typed SQLite, migration, transaction, reactive query |
| HTTP | `dio` | Interceptor, multipart, timeout, cancellation; jangan pakai package `flutter_dio` |
| Serialization | `json_annotation` + `json_serializable` | Contract eksplisit dan generated parsing |
| Secure secrets | `flutter_secure_storage` | Token saja; bukan database aplikasi |
| Google login | official `google_sign_in` | Credential diteruskan ke backend untuk diverifikasi |
| Apple login | `sign_in_with_apple` | Wajib di iOS bersama Google login, mengikuti App Store Guideline 4.8 |
| Barcode | `mobile_scanner` | CameraX/ML Kit Android, AVFoundation/Vision iOS |
| AI photos | official `camera` | Capture dan lifecycle dikelola aplikasi |
| Background opportunity | `workmanager` | Optimization, bukan jaminan correctness |
| Push | `firebase_core` + `firebase_messaging` | FCM dan APNs bridge |
| Local notification | `flutter_local_notifications` | Foreground/local alerts bila dibutuhkan |
| Localization | SDK `flutter_localizations` + `intl` | ARB/gen-l10n dan formatting |
| Connectivity hint | `connectivity_plus` | Hint untuk trigger sync, bukan bukti internet |
| Device/app metadata | `device_info_plus`, `package_info_plus` | Device registration dan diagnostics |

Koneksi dan pemilihan printer adalah requirement rilis pertama. Yang belum dikunci hanyalah package/vendor SDK final karena pilihan itu harus dibuktikan pada hardware nyata. Receipt formatting/ESC-POS encoding dan transport harus terpisah. LAN raw socket dapat memakai Dart IO. Android Bluetooth Classic/USB memakai plugin yang lolos maintenance/security review atau platform channel kecil. iOS menggunakan AirPrint, BLE/MFi, atau vendor SDK sesuai printer yang benar-benar ditargetkan. Jangan menjanjikan semua printer Bluetooth Android otomatis bekerja di iOS.

Package baru wajib memiliki active maintenance, compatible license, platform support, release health, dan alasan konkret. Tidak menambahkan analytics/crash SDK ganda.

## 14. Kamera dan AI

- Dua mode jelas: `Barcode` dan `Foto AI`.
- Barcode diproses lokal dan tetap tersedia tanpa kuota AI.
- AI membutuhkan online; offline menyimpan draft foto yang belum terkirim.
- Camera permission diminta hanya saat feature digunakan.
- Preview menampilkan framing guide, torch, close, progress, dan hasil—not decorative scanning beam wajib.
- Camera controller berhenti saat app background, route keluar, atau sheet ditutup.
- Terapkan EXIF orientation, resize long edge maksimum 1600 px, quality sekitar 80%, target 2 MB per image, sesuai kontrak Intelligence.
- Default micro-batch maksimal lima gambar; logical request ID stabil pada retry.
- Jangan mengunggah foto ke analytics/log.
- UI membedakan `found`, `uncertain`, `unknown`, busy, quota exhausted, permission denied, network error, dan service unavailable.
- Manual search selalu tersedia.

## 15. Kuota AI dan notifikasi

Kuota dikirim server dengan `used`, `limit`, `remaining`, `unlimited`, `period_start`, `period_end`, dan `reset_at`.

Peringatan default configurable:

- 80%: informasi ringan di quota indicator/notification center.
- 90%: warning yang jelas sebelum membuka AI scan.
- 100%: AI disabled dengan CTA tambah kapasitas atau gunakan barcode/manual.

Server memastikan event penggunaan idempotent. Push hanya menjadi signal; saat dibuka aplikasi mengambil state terbaru. Notifikasi operasional, promosi, dan keamanan memiliki category/channel terpisah. Pengguna dapat mematikan promosi tanpa mematikan alert transaksi atau keamanan.

## 16. Printer dan struk

### 16.1 Printer manager

- Discover/pair melalui flow platform yang diizinkan.
- Tampilkan daftar printer tersimpan dan perangkat yang ditemukan, lalu izinkan user memilih, test print, mengganti, melupakan, dan memilih kembali printer.
- Simpan konfigurasi secara lokal per pasangan `store_public_id + device_id`; printer Toko A tidak otomatis menjadi printer Toko B pada HP yang sama.
- Satu perangkat dapat menyimpan beberapa `PrinterProfile`, tetapi rilis pertama memiliki tepat satu printer default untuk purpose `receipt` pada setiap toko.
- `PrinterProfile` menyimpan nama tampilan, transport, hardware identifier lokal, paper width, encoding, capabilities, auto-print, copies, dan last successful connection. Hardware identifier tidak dikirim ke server secara default.
- Jika user login dari HP lain, printer dikonfigurasi ulang karena pairing dan permission adalah state perangkat.
- Test print.
- Status: unavailable, connecting, ready, printing, failed.
- Retry tidak boleh menduplikasi sale; print job terpisah dari transaksi.
- Print queue lokal memiliki bounded retry dan tombol retry manual.
- Capability profile: paper width 58/80 mm, encoding/code page, image/raster, cut, cash drawer.
- Gunakan boundary `PrinterTransport` karena Bluetooth Classic, BLE, USB, LAN, AirPrint, dan vendor SDK adalah external dependency yang benar-benar berbeda. Boundary ini tidak boleh berubah menjadi generic plugin framework.

### 16.2 Receipt

- Renderer canonical memakai snapshot transaksi.
- Nama/logo/alamat/telepon toko, nomor dokumen, kasir, waktu, items, discount, total, payment, change, dan footer.
- Unicode fallback/rasterization diuji untuk bahasa target.
- Preview, share PDF/image bila diizinkan platform, dan reprint dari riwayat.
- Struk transaksi lokal diberi status belum tersinkron; nomor final server tidak dipalsukan.

## 17. Localization, market, currency, dan waktu

Target negara Asia Tenggara: Indonesia, Malaysia, Singapura, Thailand, Vietnam, Filipina, Brunei, Kamboja, Laos, Myanmar, dan Timor-Leste.

Locale packs minimum: Indonesian, English, Malay, Vietnamese, Thai, Filipino, Khmer, Lao, Burmese, dan Portuguese. Rollout terjemahan boleh bertahap melalui feature flag, tetapi struktur dan CI harus siap untuk semuanya sejak awal.

- Gunakan ARB/gen-l10n; tidak ada user-facing string tersebar di widget.
- Locale UI dapat mengikuti device atau pilihan user.
- Country, currency, decimal places, currency symbol position, dan timezone adalah konfigurasi toko dari server.
- Simpan amount sebagai decimal/string atau integer minor unit sesuai kontrak domain; jangan memakai binary floating point.
- Jangan mengasumsikan semua currency memiliki dua desimal.
- Tidak ada konversi FX otomatis pada rilis ini.
- Simpan timestamp UTC; tampilkan menggunakan timezone toko.
- Nama, alamat, email, dan telepon tervalidasi tetapi tetap mendukung karakter Unicode lokal.

## 18. Design system dan UI/UX

### 18.1 Visual authority

- Brand authority: live `xsisten.com`.
- Product-system reference: `docs/design/customer-exploration-v2`.
- Folder/gambar `docs/asisten-toko` adalah kompetitor dan anti-reference; tidak boleh digunakan sebagai sumber layout, warna, copy, navigasi, atau komponen.
- Mode produk adalah **Operate**: kecepatan, hierarchy, state, dan native convention mengalahkan dekorasi.

### 18.2 Default XSISTEN theme

- Brand/action orange: `#EE4D2D`.
- Graphite ink: `#2D2928`.
- Warm ivory/background: `#FFF8F5` dengan surface netral yang accessible.
- Bentuk compact; divider dan tonal surfaces lebih utama daripada shadow.
- Orange menandai aksi utama/focus/selection, bukan memenuhi semua card.
- Landing dapat ekspresif; layar POS tetap tenang dan padat.

### 18.3 Theme customization

Owner dapat memilih `system/light/dark`, store accent dari preset, atau custom accent yang lolos contrast generation. Owner juga dapat mengatur logo toko dan identitas struk. Layout, typography fundamental, error/success/warning colors, dan disclosure promosi tidak dapat diubah.

Gunakan semantic tokens dan `ThemeExtension`, bukan raw hex di widget. Dark mode memiliki palette tersendiri: dark graphite background, elevated dark surfaces, warm light text, accessible orange, visible borders, dan gambar produk tanpa tint. Preview struk tetap berupa kertas terang.

### 18.4 Komponen domain nyata

- `StoreSwitcher`
- `SyncStatusIndicator`
- `AiQuotaIndicator`
- `ProductSearchField`
- `ProductResultTile`
- `CartLineItem`
- `CartSummary`
- `PaymentSheet`
- `CameraViewfinder`
- `RecognitionResultRow`
- `PrinterStatusTile`
- `NotificationRow`
- `SponsoredProductTile`
- `OfflineBanner`
- `EmptyState`
- `InlineError`

Gunakan komponen framework untuk button, field, navigation, sheet, dialog, switch, snackbar, dan platform affordance. Buat wrapper hanya bila menegakkan policy/theme/accessibility yang nyata.

### 18.5 Anti AI-generated UI

- Tidak membuat semua informasi menjadi rounded cards.
- Tidak menggunakan glassmorphism, glow, gradient dekoratif, atau bento dashboard generik.
- Tidak menggunakan ikon acak di lingkaran warna-warni.
- Tidak menggunakan floating center nav button.
- Tidak menambahkan dummy chart/metric.
- Tidak memakai pill untuk semua label/control.
- Tidak membuat animasi entrance seragam di seluruh layar.
- Tidak menggunakan copy marketing pada pekerjaan operasional.

Alur visual utama adalah `scan/search → confirm → cart → payment → saved/sync → receipt`.

### 18.6 Accessibility dan adaptive layout

- Touch target minimum 48 dp Android dan 44 pt iOS.
- WCAG 2.2 AA untuk text/control states.
- Dynamic text scaling tanpa clipping sampai minimum 200% untuk flow penting.
- Screen reader labels, focus order, semantic grouping, dan status tidak bergantung pada warna.
- Reduce Motion dihormati.
- Portrait phone adalah target primer; landscape, tablet, foldable, keyboard/scanner fisik diuji.
- Compact: single pane dengan cart sheet/page.
- Medium/expanded: product pane + persistent cart; navigation rail bila sesuai.

## 19. Security dan privacy

- TLS wajib; token per perangkat disimpan di Keychain/Android secure storage.
- Token dapat direvoke per device; logout mencabut token dan push registration.
- Rate limit berdasarkan user, device, store, endpoint, dan risiko.
- Semua mutasi memakai authorization dan store scoping server-side.
- Sensitive logs di-redact; tidak mencatat token, password, foto, atau payload pembayaran penuh.
- Local database berisi data bisnis dan harus dilindungi sesuai threat model; evaluasi SQLCipher sebelum production bila perangkat bersama/risiko ekstraksi menjadi requirement.
- App switcher snapshot menyembunyikan informasi sensitif bila diperlukan.
- Permission copy menjelaskan kamera, notifikasi, Bluetooth/local network, dan file access secara spesifik.
- Analytics/promotional consent dipisahkan dari permission operasional.
- Sediakan privacy policy, data deletion path, account support, dan deklarasi store yang akurat.

## 20. Reliability, performance, dan observability

- Cold start menampilkan cached workspace tanpa menunggu full network refresh setelah bootstrap pertama.
- Search katalog lokal harus responsif pada katalog besar; benchmark ditentukan dengan dataset 10k/50k product units.
- List selalu paginated/virtualized; gambar thumbnail resized dan cached dengan bounded disk policy.
- API mendukung pagination cursor, compression, ETag/revision, dan delta sync.
- Retry exponential backoff dengan jitter hanya untuk error retryable; tidak blind retry 4xx validation/auth/conflict.
- Correlation: `request_id`, `client_operation_id`, `device_id`, store public ID, app version, dan sync batch ID.
- Crash, ANR, API error rate, sync backlog age, recognition latency, quota errors, dan print failures dapat dimonitor tanpa merekam data sensitif.
- Feature flag server-side hanya untuk kemampuan nyata seperti distributor catalog placement atau rollout locale; bukan remote executable UI/code.

## 21. Testing dan quality gates

### Flutter

- Unit test: pricing/cart calculation preview, permission/capability logic, outbox state machine, retry classification, theme contrast, locale/currency format.
- Repository test menggunakan fake service + real temporary Drift database.
- Widget test untuk loading/empty/error/offline/permission/quota states.
- Golden test terbatas pada screen kritis light/dark dan text scale; bukan snapshot setiap widget.
- Integration test: login, bootstrap, online sale, offline sale then sync, duplicate retry, AI uncertain correction, quota exhausted fallback, printer failure/retry, store switching guard.
- Static analysis `flutter analyze`, formatting, unit/widget/integration test, dependency/license audit.

### Laravel

- Feature test untuk seluruh endpoint API dan error envelope.
- Tenant isolation untuk setiap endpoint store-scoped.
- Permission matrix owner/admin/cashier.
- Idempotency same-payload replay dan different-payload conflict.
- Transaction/concurrency test untuk posting sale, stock, cash, document sequence, dan quota.
- Sync cursor/tombstone contract tests.
- Katalog distributor market targeting dan promotion disclosure tests.
- Existing web behavior tidak boleh regression.

### Device matrix

- Android minimum ditentukan setelah package compatibility review; baseline harus mencakup perangkat low/mid-range yang umum di Asia Tenggara.
- iOS deployment target mengikuti Flutter/plugin stable support dan App Store requirement.
- Uji kamera gelap/blur, permission denied/restricted, low storage, clock skew, app kill, network flapping, airplane mode, token revoked, multi-device sale, 58/80 mm printer, dan Unicode receipt.

## 22. Acceptance criteria rilis

Rilis dapat dianggap siap hanya jika:

1. Owner/admin/cashier dapat login dan hanya melihat aksi yang diizinkan.
2. User dapat berpindah toko tanpa kebocoran data atau membawa cart/outbox ke toko lain.
3. Setelah bootstrap online, kasir dapat mencari produk dan membuat sale saat offline.
4. Sale offline tetap ada setelah app/process restart.
5. Retry/sync tidak pernah membuat duplicate sale.
6. Konflik tampil sebagai `needs attention` dengan tindakan jelas; tidak silent drop/overwrite.
7. Barcode dapat digunakan tanpa kuota AI.
8. AI scan melalui `sisko-plan`, mengurangi kuota satu kali, dan selalu memiliki manual fallback.
9. Peringatan kuota 80/90/100% bekerja dan promo notification dapat dimatikan terpisah.
10. Printer failure tidak membatalkan atau menggandakan sale.
11. Light, dark, system, dan custom accent lolos contrast serta tidak merusak semantic colors.
12. Currency, timezone, plural, dan angka mengikuti toko/locale tanpa floating-point error.
13. Katalog distributor perusahaan dapat diubah server-side dan cache offline diperbarui melalui delta/expiry.
14. Semua promosi memiliki disclosure yang terlihat dan accessible.
15. Kamera berhenti saat background/keluar dan permission denial memiliki recovery path.
16. Google login berhasil pada Android/iOS; Sign in with Apple berhasil pada iOS; linking tidak membuat akun ganda atau account takeover.
17. Setiap toko pada perangkat yang sama dapat memilih/mengganti printer default sendiri dan test print sebelum digunakan.
18. Build release Android/iOS menggunakan signing, app icon, splash, privacy manifest/disclosure, dan store metadata yang benar.
19. Test, lint, static analysis, migration review, API contract tests, dan final diff review lulus.

## 23. Urutan implementasi yang direkomendasikan

Ini adalah urutan dependency, bukan label MVP:

1. Bekukan API conventions, public IDs, auth device, dan permission matrix.
2. Buat Flutter shell, design tokens XSISTEN, localization, navigation, dan error model.
3. Buat Drift schema, bootstrap, cursor pull, outbox, offline lease, dan sync observability.
4. Implementasikan products read/search dan store switching.
5. Implementasikan POS manual/barcode end-to-end dengan idempotent posting.
6. Implementasikan receipt renderer dan printer hardware matrix/adapters.
7. Integrasikan camera AI, quota, retry, dan correction states.
8. Implementasikan push/device registration dan notification center.
9. Implementasikan distribution catalog + promotion disclosure/cache.
10. Hardening device matrix, accessibility, localization QA, security review, load test, dan store submission.

Setiap langkah harus menghasilkan vertical slice yang dites. Jangan membuat seluruh folder/interface kosong terlebih dahulu.

## 24. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Offline sale berbeda dengan harga/status terbaru | Revision + snapshot + reconciliation state; tidak silent overwrite |
| User dicabut tetapi device offline | Offline authorization lease configurable |
| Background sync tidak dijalankan iOS | Foreground sync adalah jalur correctness; background hanya optimisasi |
| Dukungan printer sangat terfragmentasi | Hardware matrix dan transport adapters; jangan klaim universal support |
| AI lambat/penuh/habis kuota | Micro-batch, bounded retry, explicit state, barcode/manual fallback |
| Flutter dan web menghitung berbeda | Server Action tetap otoritatif; local hanya preview |
| Scope marketplace melebar | Katalog read-only; order/commission/settlement menunggu PRD tersendiri |
| Custom theme merusak aksesibilitas | Generate semantic scheme dan tolak/adjust accent yang gagal contrast |
| Terlalu banyak abstraction | Review setiap public class/interface/dependency dan hapus pass-through layer |

## 25. Keputusan yang sengaja ditunda

- Package/vendor SDK printer final dipilih pada hardware spike pertama. Kemampuan memilih, mengganti, menyimpan, test print, dan mencetak tetap wajib pada rilis pertama.
- Batas toleransi atau auto-approval harga offline lama. Rilis pertama tetap menggunakan owner reconciliation setiap kali revision harga berbeda.
- Provider crash/analytics tunggal.
- Detail checkout, komisi, pembayaran, fulfillment, dan settlement distributor.
- Marketplace konsumen.

Keputusan tertunda tidak boleh diisi Kiro dengan asumsi diam-diam. Kiro harus membuat decision record singkat sebelum implementasi yang bergantung padanya.

## 26. Definition of done

- Tidak ada TODO/TBD pada scope yang sedang diimplementasikan.
- API terdokumentasi melalui OpenAPI/contract examples dan dites.
- Migration forward/backward strategy direview.
- Flutter app berjalan pada perangkat Android dan iOS nyata, bukan emulator saja.
- Offline, kamera, printer, notification, dark mode, custom accent, locale, dan currency diuji pada state gagal serta sukses.
- Semua dependency memiliki alasan aktif dan tidak ada wrapper/pass-through/legacy path baru tanpa boundary.
- Dokumentasi Kiro memisahkan requirement, design, dan task implementasi.
- Tidak ada penggunaan visual/copy dari aplikasi kompetitor.

## 27. Referensi teknis

- Flutter architecture: https://docs.flutter.dev/app-architecture/guide
- Flutter offline-first: https://docs.flutter.dev/app-architecture/design-patterns/offline-first
- Flutter adaptive/responsive: https://docs.flutter.dev/ui/adaptive-responsive
- Flutter platform adaptations: https://docs.flutter.dev/ui/adaptive-responsive/platform-adaptations
- Flutter localization: https://docs.flutter.dev/ui/internationalization
- Android offline-first: https://developer.android.com/topic/architecture/data-layer/offline-first
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple background modes: https://developer.apple.com/documentation/bundleresources/information-property-list/uibackgroundmodes
- Intelligence integration: `../../../intelligence-service/docs/integration.md`
- Existing product rules: `docs/00_PRODUCT_SCOPE.md`, `docs/01_BUSINESS_RULES.md`, `docs/04_SECURITY_TENANCY.md`
- XSISTEN design system: `DESIGN.md`, `docs/design/customer-exploration-v2`
