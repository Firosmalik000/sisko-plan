# Customer UI Foundation, Dashboard, Master Data, dan POS — Implementation Plan

> **Untuk implementer:** Plan ini sudah mengunci keputusan desain dan arsitektur. Kerjakan berurutan, pertahankan seluruh kontrak produksi existing, dan jangan membuka redesign atau abstraksi baru tanpa bukti dari caller nyata.

**Status:** PLANNED — siap diimplementasikan end-to-end.

**Tanggal:** 11 September 2026.

**Scope milestone:** Fondasi UI customer, Dashboard, seluruh Master Data, dan POS/Kasir.

**Plan induk:** [Customer Frontend Rebuild](./2026-09-08-customer-ui-redesign.md).

**Acuan produk:** [PRD Customer UX Discovery](../../product/PRD-CUSTOMER-UX-DISCOVERY.md).

**Acuan visual:** [Prototype customer aktif](../../design/customer-exploration-v2/app.html), beserta `app.js`, `style.css`, dan `BRIEF.md` pada direktori yang sama.

## 1. Hasil yang harus dicapai

Membangun fondasi customer yang konsisten dan reusable, kemudian membuktikannya pada tiga pola pekerjaan utama:

1. Dashboard: ringkasan, metrik, grafik, dan section informasi.
2. Master Data: server-side search/filter/pagination dan responsive record list.
3. POS/Kasir: katalog berbentuk card, keranjang, pembayaran, serta scanner.

Setelah milestone ini selesai:

- halaman route di `resources/js/pages/customer/**` menjadi entry point dan komposer yang mudah dibaca;
- komponen visual lintas halaman berada di `resources/js/components/page` dan `resources/js/components/forms`;
- komponen khusus Products dan POS tetap colocated pada folder halamannya;
- workflow lintas halaman seperti scanner tetap berada di `resources/js/features`;
- prototype menentukan tampilan dan komposisi, sedangkan source aplikasi menentukan fitur, data, izin, dan validasi;
- tidak ada fitur produksi yang hilang hanya karena tidak ditampilkan oleh prototype.

## 2. Urutan prioritas dan sumber kebenaran

Jika ditemukan konflik, gunakan urutan berikut:

1. Kontrak keamanan, tenancy, authorization, validation, dan data pada backend existing.
2. Keputusan eksplisit pengguna dalam task ini.
3. Plan ini.
4. PRD Customer UX Discovery dan plan induk.
5. Prototype customer untuk visual hierarchy, komposisi, density, interaction pattern, dan responsive behavior.
6. Implementasi frontend existing sebagai inventaris fitur dan edge case.

Prototype bukan kontrak data atau kontrak penghapusan fitur. Angka contoh, field yang tidak lengkap, dan behavior simulasi tidak boleh disalin menjadi fakta atau batas produksi.

## 3. Keputusan final yang tidak perlu ditanyakan ulang

### 3.1 Visual customer

- Font portal customer menggunakan Inter lokal.
- Background utama memakai warm white/peach: `#FFFAF7` menuju `#FFF3EF`.
- Surface konten menggunakan putih.
- Teks utama graphite sekitar `#2D2928`.
- Teks sekunder sekitar `#756D6A`.
- Primary mengikuti token tema toko dengan default brand `#EE4D2D`.
- Radius control 12px; surface utama sekitar 16px.
- Surface data dan form flat secara default; tidak memakai shadow dekoratif.
- Shadow digunakan terbatas pada modal, dropdown, floating navigation, dan layer sementara.
- Semua warna customer memakai semantic token; jangan mengulang hardcoded `teal`, `emerald`, `slate`, atau `orange-600` sebagai warna utama.
- Tema per toko dan appearance existing tetap berjalan.
- Platform/admin/public tidak ikut berubah.

### 3.2 Komposisi halaman

- Header halaman berada langsung di atas background, bukan di dalam card.
- `AppPage` menjadi satu-satunya pemilik page title, gutter, width, header, description, actions, dan contextual back.
- `PageSection` menjadi surface operasional reusable.
- Dashboard memakai section dan metric strip.
- Master Data memakai responsive record list.
- POS memakai product card untuk katalog dan list/panel untuk keranjang.
- Table hanya dibuat saat caller perbandingan data nyata tersedia; tidak dibuat dalam milestone ini hanya untuk persiapan masa depan.

### 3.3 Organisasi kode

- Tidak membuat `features/customer`.
- Shared visual foundation tetap di `components/page` dan `components/forms`.
- Komponen yang hanya digunakan Products tetap di folder Products.
- Komponen yang hanya digunakan POS tetap di folder POS.
- `features/product-scanner` dipertahankan karena dipakai lintas halaman.
- `features/reference-data` dipertahankan karena dipakai empat halaman Master Data.
- Jangan membuat universal CRUD builder, schema-driven form, atau page builder.

### 3.4 Form

- Form standar memakai shared form components existing.
- Uang memakai `FormCurrencyInput` yang baru karena mempunyai behavior khusus.
- Telepon memakai `FormPhoneInput` yang baru karena mempunyai semantics dan keyboard khusus.
- Country select ditunda sampai milestone Stores karena belum memiliki caller pada scope ini.
- Validasi otoritatif tetap di server.
- Nama payload dan shape data existing tidak berubah.

## 4. Scope

### 4.1 Dalam scope

Shared foundation:

- `resources/css/app.css`, hanya bagian customer yang diperlukan.
- `resources/js/lib/store-theme.ts`, hanya bila semantic token perlu dikonsolidasikan.
- `resources/js/components/page/app-page.tsx`.
- `resources/js/components/page/page-section.tsx`.
- `resources/js/components/page/metric-strip.tsx`.
- `resources/js/components/page/empty-state.tsx`.
- `resources/js/components/page/data-toolbar.tsx`.
- `resources/js/components/page/record-list.tsx`.
- `resources/js/components/pagination.tsx`.
- `resources/js/components/forms/**`.

Dashboard:

- `resources/js/pages/customer/dashboard.tsx`.
- Komponen colocated baru di `resources/js/pages/customer/dashboard/` bila diperlukan untuk menjaga entry point tetap ringkas.

Products:

- `resources/js/pages/customer/master-data/products/index.tsx`.
- `resources/js/pages/customer/master-data/products/use-product-drafts.ts`.
- Komponen colocated baru dalam folder Products.
- Integrasi existing dengan `resources/js/features/product-scanner/**`.

Reference Master Data:

- `resources/js/features/reference-data/reference-data-page.tsx`.
- `resources/js/pages/customer/master-data/categories/index.tsx`.
- `resources/js/pages/customer/master-data/units/index.tsx`.
- `resources/js/pages/customer/master-data/suppliers/index.tsx`.
- `resources/js/pages/customer/master-data/financial-accounts/index.tsx`.
- `resources/js/components/master-data-nav.tsx` bila alignment visual diperlukan.

POS:

- `resources/js/pages/customer/pos/index.tsx`.
- Komponen colocated baru dalam folder POS.
- Integrasi scanner, barcode, receipt, dan payment existing.

Localization dan tests:

- Seluruh file locale customer yang relevan untuk `id`, `ms`, `vi`, dan `en`.
- Test backend dan frontend existing yang melindungi Dashboard, Master Data, POS, scanner, currency, phone, pagination, dan localization.
- Test baru hanya untuk behavior yang berubah atau kontrak shared component yang berisiko.

### 4.2 Di luar scope

- Purchasing, Sales history/detail/return, Expenses, Inventory, Cash, Capital, Stock Opname, Reports, Stores, Settings, dan Subscription, kecuali perubahan shared component menyebabkan regression yang harus diperbaiki.
- Database migration atau perubahan schema.
- Endpoint baru.
- Perubahan business calculation.
- Perubahan authorization, tenancy, CSRF, atau idempotency.
- Dependency baru atau upgrade package.
- Redesign platform/admin/public.
- Country select production component sebelum milestone Stores.
- Generic `DataTable` sebelum Inventory/Reports menjadi caller nyata.
- Offline-first, APK behavior, atau native hardware certification.
- Commit, push, merge, atau deploy otomatis.

## 5. Arsitektur akhir

```text
resources/js/
├── components/
│   ├── ui/                           # Primitive existing: Button, Input, Dialog, Select
│   ├── forms/
│   │   ├── error-summary.tsx
│   │   ├── form-actions.tsx
│   │   ├── form-checkbox.tsx
│   │   ├── form-currency-input.tsx  # baru
│   │   ├── form-field.tsx
│   │   ├── form-input.tsx
│   │   ├── form-phone-input.tsx     # baru
│   │   ├── form-section.tsx
│   │   ├── form-select.tsx
│   │   ├── form-textarea.tsx
│   │   └── index.ts
│   └── page/
│       ├── app-page.tsx
│       ├── data-toolbar.tsx          # baru
│       ├── empty-state.tsx
│       ├── metric-strip.tsx
│       ├── page-section.tsx
│       └── record-list.tsx           # baru
│
├── features/
│   ├── product-scanner/              # lintas halaman, tetap
│   └── reference-data/               # lintas empat master data, tetap
│
└── pages/customer/
    ├── dashboard.tsx                 # route entry + composition
    ├── dashboard/                    # bagian dashboard yang besar
    │   └── dashboard-content.tsx
    ├── master-data/products/
    │   ├── index.tsx                 # route entry + composition
    │   ├── product-list.tsx
    │   ├── product-editor-dialog.tsx
    │   ├── product-overlays.tsx
    │   └── use-product-drafts.ts
    └── pos/
        ├── index.tsx                 # route entry + composition
        ├── pos-catalog.tsx
        ├── pos-cart.tsx
        └── pos-payment.tsx
```

Nama dan jumlah file colocated boleh disederhanakan saat implementasi bila dua bagian ternyata terlalu kecil untuk dipisah. Jangan membuat file satu komponen kecil tanpa manfaat keterbacaan yang nyata.

## 6. Aturan ownership

### Shared components boleh memiliki

- markup dan layout reusable;
- semantic styling;
- accessibility wiring;
- generic visual state;
- type yang tidak mengetahui domain;
- optional `className` untuk composition.

### Shared components tidak boleh memiliki

- endpoint;
- `router.get`, `post`, `patch`, atau `delete` untuk domain tertentu;
- permission atau subscription rule;
- nama query seperti `status`, `category`, atau `period` yang dipaksakan kepada semua caller;
- data fetching;
- business calculation;
- pengetahuan tentang Product, Sale, Store, Supplier, atau Account.

### Page entry boleh memiliki

- type props Inertia;
- adapter ringan dari props menuju content;
- page-level state/wiring yang menentukan actions dan overlay;
- `AppPage` dan komposisi section;
- layout metadata/breadcrumb bila masih diperlukan.

### Komponen colocated boleh memiliki

- markup domain;
- event handler domain;
- controlled form state yang diberikan parent;
- business-facing labels;
- conditional berdasarkan permission yang diterima melalui props.

Usahakan entry file mudah dipindai, tetapi jangan memakai target line count sebagai alasan membuat props atau abstraction raksasa.

## 7. Kontrak shared page components

### 7.1 `AppPage`

Pertahankan API sederhana:

```ts
type AppPageProps = {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    back?: { href: string; label: string };
    size?: 'standard' | 'form' | 'wide';
    children: ReactNode;
    className?: string;
};
```

Tanggung jawab:

- render `<Head title={title}>`;
- satu pemilik background, gutter, max-width, dan vertical rhythm;
- title sebagai satu `h1`;
- description hanya bila menambah konteks;
- actions sejajar desktop dan turun baris pada mobile;
- contextual back untuk detail/edit, bukan breadcrumb tambahan pada halaman utama;
- `standard` sekitar 1296px, `form` sekitar 740px, dan `wide` sekitar 1500px.

Larangan:

- tidak menerima `endpoint`, `filters`, `columns`, `dialogs`, atau `pageType`;
- tidak mengandung route detection;
- tidak mengandung customer-specific conditional; styling berasal dari semantic token workspace.

### 7.2 `PageSection`

API:

```ts
type PageSectionProps = {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
};
```

Tanggung jawab:

- surface putih radius 16;
- optional section header;
- divider hanya bila header ada;
- tidak memakai shadow default;
- content padding dapat diatur tanpa nested card;
- tidak memaksakan grid tertentu.

### 7.3 `MetricStrip` dan `MetricItem`

- Surface peach tanpa shadow.
- Divider antar-item.
- Nilai memakai `tabular-nums`.
- Empat metric menjadi empat kolom pada desktop dan 2x2 pada mobile.
- Jumlah item lain tetap wrap secara aman.
- Label, value, dan detail berupa `ReactNode`; tidak menghitung nilai.

### 7.4 `DataToolbar`

Komponen presentasional yang mendukung:

- search slot;
- filters slot;
- actions slot;
- form submit semantic;
- layout stack pada mobile dan satu baris pada desktop.

Caller tetap memiliki:

- state filter;
- endpoint;
- pembentukan query;
- reset;
- loading state;
- Inertia navigation.

### 7.5 `RecordList`

Sediakan struktur minimal:

- `RecordList` sebagai surface/container;
- `RecordListHeader` yang tersembunyi pada mobile;
- `RecordListRow` dengan divider, hover, focus, dan optional link semantics;
- `className` agar caller menentukan grid template desktop;
- tidak menerima array column schema atau `renderItem` universal.

Rows harus tetap dapat menggunakan native semantic element yang sesuai: `article`, `Link`, `button`, atau `div`.

### 7.6 `EmptyState`

API existing dipertahankan dan disempurnakan bila perlu:

```ts
type EmptyStateProps = {
    icon?: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
};
```

Bedakan melalui content caller:

- initial empty: menawarkan pembuatan data;
- filtered empty: menawarkan reset filter;
- success empty seperti stok aman: tidak memaksa action;
- error/retry: gunakan alert/error component bila semantics-nya error, bukan menyamarkan error sebagai empty.

### 7.7 `Pagination`

- Tetap menerima URL Laravel dari server.
- Tidak melakukan client-side slicing.
- `null` URL menjadi disabled semantic.
- Active page memiliki `aria-current="page"`.
- Minimum touch target 44px.
- Optional summary boleh ditambahkan hanya jika caller memiliki `from`, `to`, dan `total` nyata.
- Jangan menghitung summary dari jumlah item halaman saat total server tersedia.

## 8. Kontrak shared form components

### 8.1 Foundation existing

Semua field customer dalam scope harus menggunakan, bila sesuai:

- `FormField`;
- `FormInput`;
- `FormSelect`;
- `FormTextarea`;
- `FormCheckbox`;
- `FormSection`;
- `FormActions`;
- `ErrorSummary`.

Pertahankan:

- `label` dan `htmlFor`;
- `aria-invalid`;
- `aria-describedby` yang menghubungkan description dan error;
- required marker;
- error server di dekat field;
- disabled/processing state;
- visible keyboard focus.

### 8.2 `FormCurrencyInput`

Tujuan:

- satu behavior input uang untuk Products, POS, dan halaman finansial berikutnya;
- menggunakan konfigurasi currency toko dari `resources/js/lib/currency.ts`;
- mendukung IDR, MYR, VND, dan currency existing lain tanpa hardcode prefix;
- menghormati jumlah decimal dan posisi simbol;
- menyimpan nilai canonical decimal string untuk payload server;
- menampilkan nilai localized tanpa mengubah arti;
- menangani blank, zero, paste, focus, blur, dan validation error;
- memakai `inputMode="decimal"`;
- tidak memakai binary floating-point sebagai sumber kebenaran nominal.

API yang dituju:

```ts
type FormCurrencyInputProps = {
    id: string;
    name: string;
    label: ReactNode;
    value: string;
    onValueChange: (value: string) => void;
    description?: ReactNode;
    error?: ReactNode;
    required?: boolean;
    disabled?: boolean;
    min?: string;
};
```

Jangan mengubah payload backend hanya untuk mengikuti tampilan localized. Tambahkan pure parsing/formatting helper yang teruji bila `currency.ts` belum menyediakan arah input.

### 8.3 `FormPhoneInput`

Tujuan:

- semantics input telepon yang konsisten;
- `type="tel"`, `inputMode="tel"`, dan `autoComplete="tel"`;
- menerima `+`, angka, spasi, tanda kurung, dan dash sesuai aturan backend;
- tidak mengunci format Indonesia;
- tidak melakukan validasi atau normalisasi bisnis yang berbeda dari server;
- error tetap berasal dari Inertia/server.

Gunakan pada Supplier dan customer phone POS. Normalisasi penyimpanan tetap milik backend existing.

### 8.4 Country

Jangan membuat `FormCountrySelect` pada milestone ini. Saat Stores dimigrasikan, buat berdasarkan data negara server dan country code stabil. Jangan hardcode daftar negara frontend.

## 9. Kontrak server-side list/filter/pagination

Untuk Products dan Reference Master Data:

```text
controlled filter UI
→ page/composer membentuk query
→ router.get(endpoint, query)
→ controller memvalidasi dan tenant-scope query
→ paginate(...).withQueryString()
→ Inertia mengirim records + filter aktif
→ Pagination memakai links dari server
```

Aturan:

- URL/query server menjadi source of truth setelah response.
- Initial state filter berasal dari props Inertia, bukan nilai default frontend yang dapat berbeda.
- Submit search melalui form/Enter dan tombol apply yang konsisten.
- Saat filter berubah, jangan kirim `page` lama sehingga hasil kembali ke halaman awal.
- Reset membersihkan seluruh filter yang dimiliki surface tersebut.
- Pertahankan `preserveState`, `preserveScroll`, dan `replace` sesuai flow existing.
- Controller tetap melakukan tenant scoping dan authorization.
- `withQueryString()` mempertahankan filter pada pagination.
- Jika satu halaman kelak memiliki dua paginator, gunakan page-name berbeda; jangan memakai query `page` yang sama.
- Jangan memindahkan query atau validation ke shared component.

Products existing sudah mencari nama, SKU, dan barcode di server serta memfilter active/inactive. Kontrak tersebut harus dipertahankan.

POS adalah pengecualian:

- jangan memaksakan pagination master-data ke katalog kasir;
- pertahankan instant search existing selama dataset dan kontraknya masih sesuai;
- endpoint typeahead baru bukan scope;
- jika performance nyata membuktikan dataset tidak lagi layak dimuat, buat task backend terpisah dengan profiling dan kontrak API yang jelas.

## 10. Fase implementasi

### Fase 0 — Baseline dan perlindungan worktree

Tujuan: mengetahui kondisi awal tanpa merusak pekerjaan yang sudah ada.

- [ ] Jalankan `git status --short` dan simpan daftar file yang sudah berubah sebelum task.
- [ ] Jangan menjalankan reset, checkout file, clean, atau stash terhadap perubahan pengguna.
- [ ] Baca diff scoped sebelum menyentuh file yang sudah berubah.
- [ ] Catat route, controller, Inertia props, form payload, permission, dan test existing untuk Dashboard, Products, Reference Data, dan POS.
- [ ] Jalankan targeted test baseline bila environment siap; catat failure yang sudah ada terpisah dari regression baru.
- [ ] Buka prototype dan aplikasi pada state pembanding sebelum edit bila browser tersedia.
- [ ] Pastikan perubahan scanner/reference-data yang sedang ada pada worktree diperlakukan sebagai authoritative current state.

Gate:

- Tidak ada file pengguna yang dihapus/ditimpa.
- Kontrak fitur untuk empat area telah dicatat sebelum JSX dipindahkan.

### Fase 1 — Shared customer foundation

Files utama:

- `resources/js/components/page/app-page.tsx`.
- `resources/js/components/page/page-section.tsx`.
- `resources/js/components/page/metric-strip.tsx`.
- `resources/js/components/page/empty-state.tsx`.
- `resources/js/components/page/data-toolbar.tsx`.
- `resources/js/components/page/record-list.tsx`.
- `resources/js/components/pagination.tsx`.
- `resources/js/components/forms/**`.
- `resources/css/app.css` dan `resources/js/lib/store-theme.ts` hanya bila perlu.

Tasks:

- [ ] Selaraskan `AppPage` dengan ukuran, gutter, header, actions, dan typography prototype.
- [ ] Hilangkan shadow default `PageSection`; tambahkan `contentClassName` hanya bila dibutuhkan caller.
- [ ] Jadikan `MetricStrip` surface peach responsive.
- [ ] Standarkan `EmptyState` tanpa domain knowledge.
- [ ] Tambahkan `DataToolbar` sebagai layout/form shell presentasional.
- [ ] Tambahkan `RecordList`, `RecordListHeader`, dan `RecordListRow` yang slot-based.
- [ ] Pertahankan `Pagination` berbasis links server dan perbaiki visual/accessibility tanpa mengganti kontraknya.
- [ ] Implementasikan `FormCurrencyInput` dan parsing helper teruji.
- [ ] Implementasikan `FormPhoneInput`.
- [ ] Export field baru dari `components/forms/index.ts`.
- [ ] Pastikan customer tokens tidak mengubah admin/platform.
- [ ] Jangan membuat komponen yang belum memiliki caller dalam scope.

Gate:

- Shared API tetap kecil dan domain-agnostic.
- Minimal dua caller nyata memakai setiap pattern baru sebelum pattern dianggap stabil, kecuali currency/phone yang memiliki behavior teruji dan caller yang jelas pada fase berikutnya.

### Fase 2 — Dashboard

Files:

- `resources/js/pages/customer/dashboard.tsx`.
- `resources/js/pages/customer/dashboard/dashboard-content.tsx` bila ekstraksi memberikan boundary yang jelas.

Tasks:

- [ ] Ganti `<Head> + main + wrapper + PageHeader` dengan `AppPage`.
- [ ] Pertahankan semua `DashboardProps` dan default yang ada.
- [ ] Pertahankan branch `canViewBusinessPosition` dan `OperationalDashboard`.
- [ ] Komposisikan cashflow/performance dengan `MetricStrip` tanpa mengarang data prototype.
- [ ] Gunakan `PageSection` untuk sales trend, business position, category composition, top products, dan low stock.
- [ ] Gunakan shared `EmptyState`; hapus local duplicate setelah seluruh caller scoped bermigrasi.
- [ ] Pertahankan period query, `router.get`, `preserveState`, `preserveScroll`, dan `replace`.
- [ ] Pertahankan formatting money/quantity/locale.
- [ ] Pastikan chart memiliki accessible name dan data kosong tidak menghasilkan path invalid.
- [ ] Pastikan Operational Dashboard untuk kasir tetap menyediakan shortcut yang dapat digunakan.
- [ ] Pindahkan komponen besar hanya bila membuat route entry lebih mudah dipindai; jangan pecah helper kecil tanpa alasan.

Preservasi wajib:

- `net_revenue`, `net_cogs`, `gross_profit`, `expenses`, `estimated_profit`.
- cash, inventory value, supplier payable, dan low-stock count.
- sales trend dan transaction count.
- category sales dan top products.
- period selection dan comparison change.
- permission-based dashboard.

Gate:

- Visual mengikuti prototype pada hierarchy dan density.
- Semua data berasal dari props nyata.
- Tidak ada data “transaksi terbaru” atau “utang jatuh tempo” tambahan hanya untuk meniru demo.

### Fase 3 — Products

Files:

- `resources/js/pages/customer/master-data/products/index.tsx`.
- `resources/js/pages/customer/master-data/products/product-list.tsx`.
- `resources/js/pages/customer/master-data/products/product-editor-dialog.tsx`.
- `resources/js/pages/customer/master-data/products/product-overlays.tsx`.
- `resources/js/pages/customer/master-data/products/use-product-drafts.ts`.
- `resources/js/features/product-scanner/**` hanya untuk integration fixes yang diperlukan.

Boundary yang dituju:

- `index.tsx`: Inertia props, controller/wiring, `AppPage`, content, overlays.
- `product-list.tsx`: toolbar, count, responsive rows, empty state, pagination.
- `product-editor-dialog.tsx`: seluruh form produk/varian dan form actions.
- `product-overlays.tsx`: delete/deactivate, duplicate barcode, reference manager, barcode scanner, dan product scanner composition bila boundary ini tetap terbaca.
- `use-product-drafts.ts`: queue/draft behavior existing; jangan dipindahkan hanya demi struktur simetris.

Tasks:

- [ ] Migrasi header Products ke `AppPage`.
- [ ] Pertahankan action Isi manual, Scan produk, dan Tambah kapasitas sesuai permission/limit.
- [ ] Gunakan `MasterDataNav` tanpa membuat tab bersaing dengan primary action.
- [ ] Gunakan `DataToolbar` untuk search/status/apply/reset.
- [ ] Pertahankan server-side filter melalui `/master-data/products`.
- [ ] Ganti card grid management menjadi responsive record list seperti prototype.
- [ ] Desktop menampilkan kolom identitas, harga, stok/status, metadata, dan actions secara sejajar.
- [ ] Mobile mempertahankan nama, foto, SKU/barcode atau unit yang relevan, harga, stok, status, dan actions tanpa horizontal page overflow.
- [ ] Bedakan initial empty dari filtered empty.
- [ ] Gunakan shared `Pagination` dan pertahankan query server.
- [ ] Migrasi harga beli/jual ke `FormCurrencyInput` tanpa mengubah payload.
- [ ] Gunakan shared FormInput/FormSelect/FormTextarea/FormCheckbox/FormSection/FormActions/ErrorSummary di editor.
- [ ] Pertahankan editor sebagai modal desktop dan fullscreen mobile.
- [ ] Pastikan safe-area dan visual viewport keyboard tidak menutup form actions.
- [ ] Pastikan close/back tetap menjaga dirty-state confirmation.
- [ ] Hapus duplicate helper/markup hanya setelah caller baru bekerja.

Kontrak produk yang tidak boleh hilang:

- `_method` dan `idempotency_key`.
- `name`, `description`, `sku`, `barcode`.
- `category_public_id`.
- `retail_unit_public_id`, `large_unit_public_id`, dan quantity mode existing.
- `variant_mode`.
- `purchase_price`, `selling_price`.
- `current_stock`, `minimum_stock`.
- `variants` lengkap.
- `photo`, `remove_photo`, dan `is_active`.
- inline category/unit manager.
- subscription product limit.
- scanner tone dan lifecycle.
- barcode duplicate lookup.
- delete lalu deactivate fallback.

Kontrak varian yang tidak boleh hilang:

- `client_id`, `public_id`, dan `name`.
- harga beli/jual.
- stok dan minimum stok.
- conversion factor.
- SKU dan barcode.
- photo, photo URL, dan remove-photo flag.
- separate/shared stock behavior.

Kontrak draft/AI yang tidak boleh hilang:

- multi-photo queue dan batas config existing.
- waiting/analyzing/retry-wait/ready/failed.
- retry/backoff dan abort lifecycle.
- correction bertahan antar-draft.
- duplicate/related product handling.
- remove photo dan revoke object URL.
- response terlambat tidak mencampur draft.
- manual fallback.

Gate:

- Create/edit/delete/deactivate dan seluruh scanner flow tetap bekerja.
- Products list mengikuti komposisi prototype tanpa memangkas field produksi.
- `index.tsx` menjadi komposer, bukan lagi pemilik seluruh markup halaman.

### Fase 4 — Reference Master Data

Files:

- `resources/js/features/reference-data/reference-data-page.tsx`.
- empat route page Master Data.
- `resources/js/components/master-data-nav.tsx` bila diperlukan.

Tasks:

- [ ] Recompose `ReferenceDataPage` dengan `AppPage`, `DataToolbar`, `RecordList`, `EmptyState`, dan `Pagination`.
- [ ] Pertahankan generic field definitions existing; jangan berkembang menjadi universal CRUD engine di luar empat caller yang ada.
- [ ] Pertahankan open-create query behavior.
- [ ] Pertahankan create/edit modal, reset form, server errors, dan processing state.
- [ ] Pertahankan search dan status query per endpoint.
- [ ] Gunakan `FormPhoneInput` pada Supplier phone.
- [ ] Gunakan shared form components untuk seluruh field supported.
- [ ] Render detail rows berdasarkan konfigurasi caller tanpa menyembunyikan nilai valid seperti `0` secara tidak sengaja.
- [ ] Pastikan status tidak bergantung pada warna saja.
- [ ] Sinkronkan seluruh user-facing copy ke empat locale.

Per-page preservation:

| Halaman            | Data/action wajib                                                                    |
| ------------------ | ------------------------------------------------------------------------------------ |
| Categories         | nama/reference display, status, create/edit, search, pagination, permission          |
| Units              | nama, simbol, unit type/reference behavior, status, create/edit, search, pagination  |
| Suppliers          | nama, contact person, phone, email, address, status, create/edit, search, pagination |
| Financial accounts | nama, account type, status, create/edit, search, pagination; jangan mengarang saldo  |

Gate:

- Satu perubahan composer menghasilkan UI konsisten pada seluruh empat halaman.
- Tidak ada implementasi layout duplikat di route pages.
- Field dan validation masing-masing domain tetap utuh.

### Fase 5 — POS/Kasir

Files:

- `resources/js/pages/customer/pos/index.tsx`.
- `resources/js/pages/customer/pos/pos-catalog.tsx`.
- `resources/js/pages/customer/pos/pos-cart.tsx`.
- `resources/js/pages/customer/pos/pos-payment.tsx`.
- scanner/receipt helper existing hanya bila integration membutuhkan.

Boundary yang dituju:

- `index.tsx`: Inertia props, SaleForm owner, handler penting, `AppPage`, dan komposisi workspace.
- `pos-catalog.tsx`: mode search, category, camera/manual entry, dan product cards.
- `pos-cart.tsx`: cart items, quantity/unit/discount, empty cart, dan summary.
- `pos-payment.tsx`: customer, channel, account, discount, tender, proof, date/time, notes, validation, dan submit action.

Jangan membuat state cart ganda untuk mobile dan desktop. Satu SaleForm tetap menjadi sumber data.

Tasks:

- [ ] Migrasi page shell ke `AppPage size="wide"`.
- [ ] Pertahankan store context dan transaction-new description.
- [ ] Katalog memakai card karena selection visual adalah tugas utama.
- [ ] Card menyediakan target sentuh yang besar, foto/fallback, nama, variant/unit, harga, dan availability.
- [ ] Keranjang memakai list/panel, bukan katalog card kedua.
- [ ] Desktop/tablet lebar menampilkan katalog dan cart berdampingan.
- [ ] Mobile menampilkan katalog lalu akses “Keranjang · N barang · total” menuju cart pada halaman yang sama.
- [ ] Jangan menambah route checkout baru.
- [ ] Resize tidak boleh mereset cart, selected unit, discount, atau payment input.
- [ ] Search POS tetap instant dan tidak memakai pagination management.
- [ ] Pertahankan scanner hardware barcode+Enter.
- [ ] Pertahankan Kamera Barcode tanpa menjalankan AI.
- [ ] Pertahankan Foto AI dan multi-capture flow.
- [ ] Migrasi seluruh nominal ke `FormCurrencyInput` atau currency primitive yang sama tanpa mengubah SaleForm payload.
- [ ] Migrasi customer phone ke `FormPhoneInput`.
- [ ] Gunakan shared form components untuk field standar.
- [ ] Pastikan error server berada dekat field dan ErrorSummary dapat difokuskan bila submit gagal.
- [ ] Processing mencegah double submit.
- [ ] Primary payment action tidak tertutup tabbar, safe area, atau keyboard.
- [ ] Kamera menutupi navigasi selama aktif dan mengembalikan fokus setelah ditutup.

Kontrak SaleForm yang tidak boleh hilang:

- `account_id`.
- `transaction_discount_amount`.
- `paid_amount`.
- `payment_proof`.
- `occurred_at`.
- `notes`.
- `idempotency_key`.
- customer name, phone, email, sales channel, marketplace, dan external order fields existing.
- items dengan product/variant/unit, conversion factor, quantity, price, dan discount.

Preservasi UX:

- manual product selection;
- scanner alat;
- camera barcode;
- Foto AI;
- unknown/ambiguous/manual correction;
- repeated barcode mengikuti quantity behavior existing;
- cart empty/non-empty;
- insufficient/exact/excess payment;
- cash tender suggestions berdasarkan currency toko;
- payment proof dan receipt flow;
- dirty/in-progress data tidak hilang saat modal atau kamera dibuka.

Gate:

- Posting transaksi tetap melewati request/validation/idempotency existing.
- Mobile POS dapat menyelesaikan transaksi tanpa action tertutup atau cart hilang.
- Visual mengikuti prototype namun seluruh field produksi tetap tersedia.

### Fase 6 — Localization, accessibility, dan responsive hardening

- [ ] Tambahkan/ubah seluruh key pada `id`, `ms`, `vi`, dan `en` secara sinkron.
- [ ] Jangan meninggalkan raw key pada UI.
- [ ] Placeholder/interpolation sama pada semua locale.
- [ ] Jangan menerjemahkan kode, SKU, barcode, currency code, atau nomor dokumen.
- [ ] Pastikan satu `h1` per halaman.
- [ ] Pastikan label programmatic pada setiap input.
- [ ] Pastikan icon-only buttons memiliki accessible name.
- [ ] Pastikan status disampaikan melalui teks, bukan warna saja.
- [ ] Pastikan focus visible dan urutan keyboard logis.
- [ ] Pastikan target sentuh minimum 44px.
- [ ] Pastikan reduced-motion preference dihormati oleh interaksi yang bergerak.
- [ ] Pastikan tidak ada horizontal page overflow pada seluruh viewport wajib.
- [ ] Tabel tidak diperkenalkan pada scope ini hanya karena desktop memiliki kolom; RecordList harus beradaptasi pada mobile.

### Fase 7 — Cleanup dan final verification

- [ ] Hapus local `PageHeader`/`EmptyState` duplicate hanya setelah semua scoped caller berpindah.
- [ ] Hapus class dan wrapper visual lama yang benar-benar sudah tidak memiliki caller.
- [ ] Jangan meninggalkan compatibility wrapper permanen.
- [ ] Jangan menghapus utilitas yang masih dipakai halaman di luar scope.
- [ ] Jalankan formatter hanya pada file scope; jangan memformat seluruh repository tanpa kebutuhan.
- [ ] Jalankan automated checks.
- [ ] Jalankan browser comparison pada prototype dan aplikasi.
- [ ] Review `git status`, `git diff --stat`, `git diff --check`, dan diff scoped.
- [ ] Pastikan tidak ada debug output, artifact screenshot yang tidak diminta, atau perubahan dependency/lockfile.

## 11. Matriks state yang wajib diverifikasi

### Dashboard

| State                         | Bukti                                                                |
| ----------------------------- | -------------------------------------------------------------------- |
| Owner/full metrics            | seluruh metric, chart, category, top product, dan low stock terlihat |
| Restricted/operator           | operational dashboard tampil tanpa data finansial terlarang          |
| Empty chart/category/products | shared empty state dan chart aman                                    |
| Period change                 | URL/query dan data berubah tanpa scroll/state regression             |
| Large amount/long store name  | tidak truncate informasi kritis atau overflow                        |

### Products

| State                 | Bukti                                                             |
| --------------------- | ----------------------------------------------------------------- |
| Normal list           | responsive rows, total, status, harga, stok, dan actions terlihat |
| Initial empty         | action create/scan sesuai izin dan limit                          |
| Filtered empty        | reset filter tersedia, bukan pesan initial empty                  |
| Page > 1              | search/status tetap pada pagination                               |
| Read-only user        | create/edit/delete tidak muncul                                   |
| Product limit reached | upgrade/capacity action tetap benar                               |
| Create manual         | semua field dan validation tersedia                               |
| Create scan/AI        | queue, review, correction, save-next tetap                        |
| Edit normal/variant   | payload dan photo behavior tetap                                  |
| Delete blocked        | deactivate fallback dan history-safety copy tetap                 |
| Keyboard mobile       | form action terlihat dan scroll dipertahankan                     |

### Reference Master Data

| State                    | Bukti                                                    |
| ------------------------ | -------------------------------------------------------- |
| Normal list              | details domain dan status terlihat                       |
| Empty/filter empty       | copy dan action sesuai konteks                           |
| Create/edit              | field config, validation, processing, active state tetap |
| Search/status/pagination | server URL dan query konsisten                           |
| Supplier phone           | keyboard tel, payload, dan server error benar            |

### POS

| State                    | Bukti                                                          |
| ------------------------ | -------------------------------------------------------------- |
| Empty cart               | katalog tetap dapat digunakan dan next action jelas            |
| Product/variant/unit     | selection dan conversion tidak berubah                         |
| Mobile cart              | jump menuju cart; tabbar/keyboard tidak menutup payment        |
| Desktop workspace        | katalog dan cart seimbang tanpa nested scroll yang tidak perlu |
| Discount                 | item dan transaction discount tetap                            |
| Customer/contact/channel | dependency field dan validation server tetap                   |
| Currency                 | symbol, decimal, tender suggestion, paid/change benar          |
| Payment error            | isian tidak hilang dan error dapat ditindaklanjuti             |
| Processing/success       | double submit dicegah; receipt/completion tetap                |
| Hardware barcode         | barcode+Enter tidak mengganggu field lain                      |
| Camera barcode           | lookup tanpa AI                                                |
| Foto AI                  | capture/review/correction/manual fallback tetap                |

## 12. Responsive verification

Periksa prototype dan aplikasi pada viewport aktual:

- 320px: minimum supported phone.
- 375px: primary mobile reference.
- 640px: large phone/small tablet transition.
- 768px: tablet/navigation transition.
- 1024px: tablet landscape/narrow desktop.
- 1280px: primary desktop reference.
- 1536px: wide desktop dan max-width behavior.

Pada setiap viewport periksa:

- actual viewport size, bukan hanya preset label;
- tidak ada horizontal page overflow;
- header/action wrapping;
- title dan description hierarchy;
- section rhythm;
- list/card density;
- modal width/height;
- safe-area/tabbar spacing;
- keyboard-sensitive form actions;
- long labels dan large currency values;
- focus states dan minimum touch targets.

Minimal evidence pair untuk setiap halaman utama:

```text
URL | viewport | prototype screenshot | app screenshot | state | feature contract checked | result/defect
```

Lakukan satu putaran defect scan pada mobile dan desktop, perbaiki seluruh temuan dalam satu batch, kemudian satu putaran konfirmasi. Jangan melakukan polishing loop tanpa batas.

## 13. Automated verification

Jalankan narrow tests setelah setiap fase:

```sh
php artisan test --compact tests/Feature/DashboardTest.php
php artisan test --compact tests/Feature/MasterDataTest.php
php artisan test --compact tests/Feature/SalesPosTest.php
php artisan test --compact tests/Feature/ProductScannerEndpointTest.php
php artisan test --compact tests/Feature/LocaleTest.php
```

Frontend behavior tests:

```sh
npm run test:units
```

Quality checks setelah semua fase:

```sh
npm run types:check
npm run lint:check
npm run format:check
npm run i18n:check
npm run build
git diff --check
```

Jika PHP dimodifikasi, jalankan:

```sh
vendor/bin/pint --dirty --format agent
```

Jangan menjalankan seluruh backend suite sebagai pengganti targeted tests. Jalankan suite lebih luas hanya jika shared contract atau hasil targeted tests menunjukkan blast radius yang lebih besar.

Test behavior baru yang perlu ditambahkan bila belum dilindungi:

- currency input round-trip untuk IDR/MYR/VND, decimal, blank, paste, dan symbol position;
- phone input attributes dan preservation;
- Products filter reset tidak membawa page lama;
- filtered-empty berbeda dari initial-empty;
- pagination mempertahankan search/status;
- page entry tidak lagi memiliki duplicate page header/empty state bila source-level test existing memakai pola tersebut;
- cart state tidak digandakan untuk responsive layout;
- localized keys baru lengkap pada empat locale.

Jangan membuat snapshot test kosmetik yang hanya mengulang class JSX.

## 14. Risiko dan mitigasi

| Risiko                                   | Mitigasi                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Worktree sudah memiliki banyak perubahan | selalu baca diff scoped; jangan reset/checkout/clean/stash perubahan pengguna                      |
| Shared component mengubah admin/platform | gunakan semantic token dan customer workspace; jangan mengubah primitive global tanpa caller audit |
| `AppPage` menjadi page builder           | pertahankan API title/description/actions/back/size/children saja                                  |
| RecordList terlalu abstrak               | slot-based composition; grid template dan domain markup tetap di caller                            |
| Form currency mengubah payload           | canonical decimal string tetap; tambah round-trip tests                                            |
| Phone formatter menolak negara lain      | jangan format atau validasi lebih ketat daripada server                                            |
| Prototype memangkas fitur                | buat preservation checklist dari props/request/handler sebelum memindahkan JSX                     |
| Products refactor memutus draft/scanner  | pindahkan boundary bertahap; jangan menulis ulang queue hook tanpa defect evidence                 |
| POS state hilang saat responsive render  | satu SaleForm dan satu component tree; CSS layout, bukan duplicated mobile/desktop state           |
| Pagination kehilangan filter             | gunakan server links + `withQueryString`; test page > 1                                            |
| Hardcoded colors tetap tersebar          | detector/source scan scoped setelah implementasi; status semantic tetap diperbolehkan              |
| File terlalu banyak                      | hanya ekstrak boundary besar; komponen kecil boleh tinggal bersama parent file                     |

## 15. Definition of done

Milestone hanya boleh disebut selesai bila seluruh poin berikut terbukti:

- [ ] Dashboard, Products, Categories, Units, Suppliers, Financial Accounts, dan POS memakai fondasi baru.
- [ ] Tampilan mengikuti prototype pada hierarchy, font, palette, density, surface, list/card choice, dan responsive behavior.
- [ ] Tidak ada field atau workflow produksi yang hilang.
- [ ] `AppPage` menjadi satu page shell pada seluruh halaman scope.
- [ ] Tidak ada duplicate `PageHeader` atau local generic `EmptyState` pada halaman scope.
- [ ] Shared components tidak mengetahui domain atau endpoint.
- [ ] Products dan POS entry files mudah dipindai; domain components colocated, bukan dipindahkan ke shared secara palsu.
- [ ] Search/filter/pagination Master Data tetap server-side dan tenant-safe.
- [ ] POS tetap instant, satu cart state, dan tidak dipaksa memakai pagination management.
- [ ] Product editor tetap modal desktop dan fullscreen mobile.
- [ ] Scanner hardware, camera barcode, dan Foto AI tetap bekerja sesuai tujuan masing-masing.
- [ ] Currency dan phone fields memakai shared components proper.
- [ ] Tema toko dan appearance existing tetap bekerja.
- [ ] ID, MS, VI, dan EN lengkap.
- [ ] Targeted backend tests lulus atau failure existing didokumentasikan dengan bukti pembanding.
- [ ] Frontend unit, types, lint, format, i18n, dan build checks lulus.
- [ ] Browser comparison mobile dan desktop selesai untuk state penting.
- [ ] Tidak ada horizontal overflow, hidden primary action, inaccessible control, atau form action tertutup keyboard/tabbar.
- [ ] Final diff tidak memiliki debug output, dependency drift, generated artifact, atau perubahan di luar scope.

## 16. Handoff setelah milestone

Setelah definition of done terpenuhi:

1. Jadikan shared API dan visual rules dari milestone ini sebagai pola untuk halaman customer berikutnya.
2. Migrasikan kelompok berikut secara bertahap, bukan sekaligus: Sales/Purchasing, Operations/Expenses, Reports/Stores/Settings/Subscription.
3. Buat `DataTable` saat Inventory atau Reports menjadi caller pertama dan validasi bersama caller kedua.
4. Buat `FormCountrySelect` saat Stores dimigrasikan menggunakan data negara server.
5. Jangan menyebut seluruh customer selesai hanya karena milestone ini selesai; plan induk tetap memiliki cakupan 25 halaman.

**Langkah implementasi berikutnya:** mulai Fase 0, lalu Fase 1 dan Dashboard. Jangan mulai dari POS dan jangan membuat semua shared components sekaligus tanpa caller.
