# XSISTEN POS Mobile API (`/api/v1`)

Kontrak API mobile untuk XSISTEN POS. Sumber kebenaran mesin: [`openapi-v1.yaml`](./openapi-v1.yaml)
(OpenAPI 3.1). Dokumen ini merangkum konvensi dan strategi migrasi
forward/backward yang wajib dipatuhi klien Flutter dan backend Laravel.

## Konvensi inti

- **Envelope**: sukses `{ data, meta.request_id }`, gagal
  `{ error: { code, message, fields, retryable }, meta.request_id }`. Tidak ada
  bentuk respons lain.
- **Uang & kuantitas**: string decimal — uang scale 4, quantity scale 6. Tidak
  pernah float. Klien memakai library `decimal`.
- **Identifier**: eksternal memakai `public_id` (ULID); integer internal tidak
  pernah diekspos.
- **Waktu**: disimpan UTC, diekspos ISO 8601 Zulu; klien menampilkan per timezone
  toko.
- **Idempotency**: write memakai `client_operation_id` (atau header
  `Idempotency-Key`). Payload sama → hasil sama; payload beda + id sama → 409
  `IDEMPOTENCY_CONFLICT`.
- **Tenancy**: endpoint store-scoped memverifikasi membership aktif; resource
  lintas-tenant → 404 (menyembunyikan keberadaan).
- **Rate limit**: named limiter per (user, device, store, endpoint, risiko).
  Melebihi ambang → 429 `RATE_LIMITED` (`retryable=true`).

## Kode error stabil

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`,
`IDEMPOTENCY_CONFLICT`, `UNSUPPORTED_OPERATION`, `INTERNAL`. Kode adalah bagian
kontrak — klien bercabang pada `error.code`, bukan `message` (yang dapat
di-lokalkan).

## Strategi migrasi forward/backward

Aplikasi mobile dirilis ke store dan tidak bisa dipaksa update seketika,
sehingga versi klien lama dan baru berjalan bersamaan terhadap backend yang sama.

### Aturan kompatibilitas server (backward compatible di dalam `v1`)

1. **Additive-only pada `v1`.** Menambah field respons opsional, endpoint baru,
   `operation_type` baru di registry sync, atau kode error baru diperbolehkan
   tanpa menaikkan versi. Klien wajib mengabaikan field yang tidak dikenal.
2. **Tidak menghapus/rename field atau mengubah tipe** dalam `v1`. Perubahan
   breaking (hapus field, ubah semantik, ubah tipe uang) memerlukan `/api/v2`.
3. **Registry sync tertutup**: `operation_type` yang tidak dikenal server →
   `UNSUPPORTED_OPERATION` tanpa side effect. Ini membuat klien lama aman saat
   server menambah operasi baru, dan klien baru terdegradasi rapi terhadap
   server lama.
4. **Enum bersifat open pada sisi klien**: klien memperlakukan nilai enum tak
   dikenal (mis. `payment_method`, `sales_channel`) sebagai "tidak didukung"
   alih-alih crash.
5. **Idempotency menjamin retry aman** lintas versi: klien lama yang mengulang
   operasi setelah server upgrade tetap menerima hasil yang sama.

### Aturan kompatibilitas klien (forward compatible)

1. Parsing toleran: abaikan field baru, jangan asumsikan urutan.
2. Bercabang pada `error.code` dan `error.retryable`, bukan teks pesan.
3. Fitur di balik ketersediaan endpoint/field — deteksi kapabilitas via `/me`
   dan `/stores/{store}/bootstrap`, bukan hardcode versi.

### Kapan naik ke `/api/v2`

Hanya untuk perubahan breaking yang tak dapat dibuat additive: mengubah bentuk
envelope, mengubah representasi uang/waktu, menghapus/rename field yang dipakai,
atau mengubah semantik autentikasi. `v1` dan `v2` berjalan berdampingan selama
periode deprecation; klien lama tetap dilayani `v1` hingga masa dukungan berakhir.

## Verifikasi kontrak

Struktur file kontrak dan keberadaan path kunci diverifikasi oleh
`tests/Feature/Api/V1/OpenApiContractTest.php`. Ubah kontrak → perbarui YAML dan
test bersamaan.
