# Camera Scanning Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work inline unless delegation is explicitly authorized. This document authorizes no production deployment.

**Goal:** Pengguna bisa foto beruntun, mencampur barcode, review, menutup/membuka kamera, dan menyimpan hasil tanpa kehilangan data atau duplikasi, dengan maksimal sepuluh foto belum selesai.

**Architecture:** Perpanjang lifecycle sesi pada hook/komponen yang sudah ada; pisahkan visibility kamera dari umur antrean. Recognition menggunakan ScannerCapture sebagai sumber hasil dan discovery menggunakan ProductDraft untuk satu kelompok foto satu produk. Backend Laravel tetap menguasai tenancy, harga, stok, dan penggunaan kuota; intelligence-service tetap memproses inferensi melalui slot terbatas.

**Tech Stack:** Laravel 13/PHP, React 19/TypeScript/Inertia, MediaStream/Canvas, decoder barcode yang sudah terpasang, FastAPI/ONNX Runtime untuk service yang sudah ada.

**Spec:** `../specs/2026-09-09-camera-scanning-session-design.md` (baca bersama rencana ini).

## Global Constraints

- Maksimal 10 foto belum selesai per halaman/sesi aktif, termasuk foto sedang dikompresi, queued, request aktif, retry-wait, dan foto kelompok produk baru yang belum ditutup.
- Maksimal satu request foto aktif per halaman: recognition satu foto; discovery satu kelompok berisi 1–3 foto.
- Tidak ada tombol global Mulai proses. Tombol akhir adalah Periksa hasil atau Periksa draft.
- Sesi tidak dijanjikan pulih lintas reload; menutup overlay pada halaman yang sama tidak menghapus sesi.
- Harga, stok, permission, subscription, dan tenancy tetap otoritatif di backend; jangan mengubah financial posting.
- Jangan menambah dependency, endpoint, broker, SDK, global state framework, atau persistent offline storage.
- Implementasi wajib memakai simplicity-review sebelum edit dan pada final diff.
- QA pada 320, 375, 640, 768, 1024, 1280, 1536 px.
- Tidak menjalankan load test pada produksi atau mengubah env produksi sebagai efek samping implementasi.

## Persiapan dan urutan

- [ ] Baca AGENTS.md, spec, docs/00_PRODUCT_SCOPE.md, 01_BUSINESS_RULES.md, 02_ARCHITECTURE.md, 03_DATABASE_STANDARDS.md, 04_SECURITY_TENANCY.md, 05_TESTING_QUALITY.md, 06_UI_UX_STANDARDS.md dan PHASES.md. Registry sekarang menandai fase 0–8 selesai; pekerjaan ini enhancement lintas permukaan, bukan mengulang fase 8.
- [ ] Periksa status git tiap repository; gunakan isolasi kerja sesuai workflow eksekusi dan jangan menimpa perubahan user.
- [ ] Jalankan baseline focused tests dan catat kegagalan yang sudah ada. Jangan memperluas scope untuk memperbaiki kegagalan tidak terkait.

Paths di bawah relatif terhadap `sisko-plan/`, kecuali ditandai `../intelligence-service/`.

## Task 1 — Error kapasitas dan penggunaan kuota yang aman untuk retry

**Files:**
- Modify: `app/Http/Controllers/Customer/ProductScannerController.php`
- Modify: `app/Http/Requests/Scanner/RecognizeCatalogItemsRequest.php`
- Modify: `app/Http/Requests/Scanner/DiscoverCatalogItemRequest.php`
- Modify: `app/Services/Subscriptions/ScanQuota.php`
- Modify: `resources/js/components/product-scanner/types.ts`
- Test: `tests/Feature/ProductScannerEndpointTest.php`

**Interfaces:** recognize/discover menerima `scan_request_id` UUID stabil dari capture/kelompok. Response error membawa `code`, `retryable`, dan optional `retry_after_ms`. Upstream request ID discovery tetap sama pada retry payload identik. Log trace request HTTP tetap dapat berbeda dari identitas pekerjaan logis.

- [ ] Tambahkan regression test konkret pada class test yang ada:

```php
public function test_capacity_rejection_does_not_consume_scan_quota(): void
{
    [$user, $store] = $this->ownerAndStore();
    config()->set('services.catalog_intelligence.enabled', true);
    Http::fake(['*/api/v1/catalog-item-recognitions' => Http::response([
        'status' => 'error',
        'message' => 'Busy',
        'data' => ['code' => 'SERVICE_BUSY'],
    ], 429)]);
    $this->actingAs($user)->withSession(['active_store_id' => $store->id])
        ->postJson(route('scanner.catalog-items.recognize'), [
            'purpose' => 'sale',
            'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
            'images' => [UploadedFile::fake()->image('one.jpg')],
            'capture_ids' => ['capture-1'],
        ])->assertStatus(429)
        ->assertJsonPath('code', 'SCANNER_BUSY')
        ->assertJsonPath('retryable', true);
    $this->assertDatabaseMissing('subscription_scan_events', [
        'store_id' => $store->id,
        'operation' => 'recognize',
    ]);
}
```

- [ ] Run `php artisan test --filter=ProductScannerEndpointTest`; confirm new regression fails before implementation.
- [ ] Map SERVICE_BUSY/DISCOVERY_BUSY to retryable capacity; map DISCOVERY_QUOTA_EXCEEDED and DISCOVERY_SPEND_LIMIT_EXCEEDED to distinct nonretryable errors. Preserve subscription/auth/validation distinctions. Do not classify all 429 as temporary.
- [ ] Move recognition/discovery scan charging after successful upstream response, using an atomic existing consume transaction; perform a non-consuming entitlement check before upstream to reject already-exhausted accounts. Add `ScanQuota::ensureAvailable(Store $store, string $requestKey, int $units): void` for this active policy check; if the same scoped key was already charged, permit its retry even when remaining credits are now zero. Revalidate subscription/authorization regardless. Leave lookup/barcode charging behavior unchanged.
- [ ] Use a quota request key computed from actor, store, operation, scan_request_id, market/purpose, and image content hashes. Identical retry charges once via existing event idempotency; changed payload produces a different key. Do not trust a client UUID alone to authorize unlimited free scans.
- [ ] Keep consume atomic under the existing owner lock. If two distinct operations race for the last credit, one may finish upstream and then be denied by the final quota check: return explicit quota exhaustion without delivering uncharged successful results. Document this bounded provider-work tradeoff; do not add a reservation/job subsystem for this change.
- [ ] Forward the stable logical UUID to discovery for provider replay. Retake/edited photo group gets a new UUID. Retry of an ambiguous network result is manual; never silently launch repeated paid calls.
- [ ] Add tests: discovery quota is nonretryable; two identical successful retries charge once; same UUID with different images cannot bypass charge; busy then success charges once; foreign-store access remains denied. Update all existing recognize/discover test payloads with valid UUIDs.
- [ ] Run focused tests, `composer lint:check`, `composer types:check`. Review quota semantics and error contract before Task 2.

## Task 2 — Antrean 10 dan hasil multi-item yang tidak destruktif

**Files:**
- Modify: `resources/js/components/product-scanner/types.ts`
- Modify: `resources/js/components/product-scanner/use-product-scanner.ts`
- Modify: `resources/js/components/product-scanner/CaptureTray.tsx`
- Modify: `resources/js/components/product-scanner/ScanReview.tsx`
- Test: existing browser flow plus `tests/Feature/ProductScannerEndpointTest.php` multi-item fixtures

**Interfaces:** extend ScannerCapture with stable `requestId`, `revision`, `attempts`, `retryAt`, and status `retry_wait`; preserve `captureId` + `itemIndex` identities. Make `blob: Blob | null` when successful recognition no longer needs its upload; failed/pending captures retain their blob. Hook remains canonical owner of its captures. `ScannerSelection` remains canonical input to page cart/purchase/opname handlers.

- [ ] Reproduce before-change: one image returning three regions currently renders one result; six queued photos may send six requests. Record these as failing browser acceptance cases.
- [ ] Remove the bestResult truncation and both destructive merge-by-first-result paths. Preserve every response item for each capture. Derive grouped display totals from the full source results; never destroy source identities to display a combined quantity.
- [ ] Add synchronous reservation of queue slots before asynchronous normalization, so rapid shutter taps cannot exceed ten. Count queued/recognizing/retry_wait/normalizing; failed terminal does not count.
- [ ] Replace concurrency 6 with one active request. Continue scheduling while review or overlay is closed but page/context remains active. Suspend new dispatch while document is hidden/offline. One retry-wait item must not prevent eligible later work.
- [ ] Implement this scheduling contract in the existing hook, without a generic queue service:

```ts
const retryDelayMs = (attempt: number) =>
    Math.min(2000, 1000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 501);
// Before normalization: reserve capacity synchronously.
// Before fetch: acquire the single in-flight slot synchronously.
// Request body: scan_request_id = capture.requestId.
// Apply response only if capture.id and capture.revision still match.
// Capacity 429: at most two retries, max 30 seconds from first dispatch.
// Finally: release in-flight slot and schedule the next eligible capture.
```

- [ ] Decode retryable/code from Task 1. Capacity errors retry; validation/quota/auth do not. Network/timeout exposes manual retry. Honor bounded Retry-After if present.
- [ ] For retake, increment revision and assign new requestId before dispatch; stale response from old revision is ignored. Removing a capture aborts where possible and ignores late completion.
- [ ] Enforce full review settlement: successful choices or explicit skipped results only; disable commit while unhandled pending/unknown/failed results remain. Show why and allow resolving/skipping them.
- [ ] Browser assertions: 10 unresolved accepted, 11th blocked, one resolution unlocks 11th; max one fetch active; three regions visible; repeated SKU across two regions totals two; retake replaces entire capture; terminal failure does not block later photos.
- [ ] Run `npm run types:check`, `npm run lint:check`; repeat those browser cases with delayed responses and capacity errors.

## Task 3 — Kamera berkelanjutan, campuran barcode, dan close/reopen

**Files:**
- Modify: `resources/js/components/product-scanner/ProductScanner.tsx`
- Modify: `resources/js/components/product-scanner/CameraViewport.tsx`
- Modify: `resources/js/components/product-scanner/use-camera.ts`
- Modify: `resources/js/components/product-scanner/ScanReview.tsx`
- Modify: `resources/js/pages/customer/pos/index.tsx`
- Regression callers: `resources/js/pages/customer/purchasing/index.tsx`, `resources/js/pages/customer/operations/stock-opnames/show.tsx`

**Interfaces:** keep existing purpose and ScannerSelection inputs. Add `onSessionChange(summary: { pendingPhotos: number; reviewItems: number; hasUnapplied: boolean }): void` for page-level Lanjut scan/Lihat hasil labels and checkout blocking; callers use it actively. This is a derived notification, not a second mutable result store. Add `initialView: 'camera' | 'review'` read only on the closed-to-open transition. Scanner already stays mounted in page Suspense; preserve that lifetime. Change onConfirm to return `ScannerApplyResult` and migrate POS, purchase, and opname handlers in the same task:

```ts
export type ScannerApplyResult = {
    applied: Array<{ captureId: string; itemIndex: number }>;
    failures: Array<{ captureId: string; itemIndex: number; message: string }>;
};
// Product draft capture does not use this cart/result-application callback.
// onConfirm: (selections: ScannerSelection[]) => ScannerApplyResult
```

- [ ] Reproduce failing lifecycle: take photo automatically opens review; barcode success opens review; closing must not imply reset.
- [ ] Remove automatic setReviewing(true) after ordinary photo, barcode, and recognition completion. Only explicit review, completed targeted retake, or user back from target opens review.
- [ ] Separate close from reset: close releases camera and hides overlay but retains captures/edits/queue; reset occurs only after applied results, explicit discard, transaction/context end, or unmount.
- [ ] Preserve mode on same-session reopen; reset to Foto barang for genuinely new session. Implement large shutter, Foto barang/Barcode control, pending status, thumbnail tray, and Periksa hasil action. No server jargon or confidence percentage in product UI.
- [ ] Stop auto/decoder immediately on review; stop stream on overlay close/background/unmount. Reopen reacquires camera only if needed; create fresh motion baseline and prevent auto-capture of the last stationary item. Never promise background browser execution.
- [ ] Barcode mode keeps stream active after detection. Suppress same visible code until absence, allow distinct next code; do not use a fixed timer alone to repeatedly count a stationary barcode.
- [ ] Add target result identity for Pastikan dengan barcode; it updates one result. General barcode mode adds one capture event. Retake is explicitly photo-scoped, not a partial region replacement.
- [ ] Page labels: empty → Scan barang; uncommitted session → Lanjut scan + Lihat hasil (n). Both are one-tap entry points without intermediate permission confirmation when browser access already exists.
- [ ] Guard Bayar with unresolved/unapplied session state. Prevent double confirmation; make cart handler report failed/unavailable selections instead of silently dropping/clamping. Apply using the canonical sale option identity including variant/unit, not product name alone. Compute the application result before updating state, avoiding side effects inside a React state updater. Mark accepted result identities applied only after application succeeds; remove a capture only after all of its items are applied/skipped, retaining failed items for resolution. A mixed-result photo must not replay its already-applied items.
- [ ] Test exact journey: A/B photos, C barcode, D photo → review → edit B quantity → Tambah foto → E → close → reopen → review → commit → reopen → F → commit. A–E must not replay during the F commit.
- [ ] Verify purchase/opname callbacks retain their existing business semantics and receive all selected items; do not redesign those pages.

## Task 4 — Kelompok foto produk dan modal yang bisa dilanjutkan

**Files:**
- Modify: `resources/js/pages/customer/master-data/products/use-product-drafts.ts`
- Modify: `resources/js/pages/customer/master-data/products/index.tsx`
- Modify: `resources/js/components/product-scanner/ProductScanner.tsx`
- Modify: `resources/js/components/product-scanner/BarcodeScannerDialog.tsx`
- Modify: `resources/js/components/product-scanner/types.ts`
- Test: `tests/Feature/ProductScannerEndpointTest.php` discovery image limits plus browser draft journey

**Interfaces:** replace ProductDraft.file with `files: File[]`, add `barcode`, `requestId`, and unsealed status `capturing`. Canonical draft has 1–3 photos of one item. Replace onProductCaptures(File[]) with `onProductCapture(photo: File): void`, consumed by active draft append; add `onSealProduct(): void` for Produk berikutnya/Periksa draft. Migrate all active product-flow callers and remove old batch-one-photo-as-product interpretation.

- [ ] Reproduce current one-photo exit and separate drafts per File; record the expected one draft from two views as failing browser case.
- [ ] Keep product draft lifecycle in useProductDrafts; scanner capture UI sends images to active draft. Do not store a second competing discovery queue in useProductScanner. Product mode consumes parent pending photo count for the ten-photo admission rule.
- [ ] Seal active draft on Produk berikutnya/Periksa draft, then dispatch one discovery request with all files. Reduce draft concurrency 2 to 1. Allow sealing even if the pending count reaches ten.
- [ ] Upload contract:

```ts
const form = new FormData();
form.append('purpose', 'product');
form.append('market', 'ID');
form.append('scan_request_id', draft.requestId);
draft.files.forEach((file) => form.append('images[]', file, file.name));
```

- [ ] Bind camera barcode to explicit draft/variant target. For known codes, look up within active store and show existing product instead of silently saving a duplicate. Keep permission boundaries; store lookup isn't permission to edit.
- [ ] Preserve form data, per-field dirty flags, scroll position and focus when scanner opens. Late AI suggestions fill only untouched fields. Existing product photo edit does not trigger implicit repricing/discovery.
- [ ] Update BarcodeField to editable input with value/onChange plus camera button; preserve leading zeroes as text. An Enter from scanner must not accidentally submit the whole product form. Keep physical-scanner pairing UI outside scope.
- [ ] Keep existing full-screen mobile modal; simplify first-visible field order and sticky footer per spec without dropping required validation or active variant behavior. Add Simpan & berikutnya for draft queue.
- [ ] Remove save-completed draft from pending list; preserve invalid draft and edits. Return from form to Tambah produk lain resumes current queue; reopening create does not resurrect saved drafts.
- [ ] Browser assertions: A front+back+barcode = one draft/request; seal A and capture B concurrently with analysis; changing A name during response retains typed name; form close/reopen retains draft; saving A then opening camera starts B, not another A; ten-photo cap doesn't prevent sealing.

## Task 5 — Gambar, antrean server, dan pengukuran

**Files:**
- Modify: `resources/js/components/product-scanner/use-camera.ts`
- Modify: `resources/js/components/product-scanner/ProductScanner.tsx`
- Modify: `resources/js/components/product-scanner/CaptureTray.tsx`
- Modify: `config/services.php` only if separating validation limits becomes necessary for active callers; current common maximum three already fits both request types
- Modify: `docs/operations/PRODUCTION_RUNBOOK.md` with measured rollout values
- Modify: `../intelligence-service/benchmarks/load_recognition.py`
- Test: `../intelligence-service/tests/unit/test_benchmark_report.py`, `tests/unit/test_inference_runtime.py`

**Interfaces:** normalizeImage accepts an active-purpose maxDimension/quality; capture already accepts these. Benchmark separates successful response latency/throughput from all-response latency/throughput.

- [ ] Add purpose-specific normalization with active callers; no generic image pipeline. POS 768/0.66, discovery and barcode 1280/0.82, no upscaling; generate 160 px thumbnail and clean up unused blobs/URLs/bitmaps.
- [ ] Confirm ten pending high-resolution phone gallery images are normalized sequentially; do not decode all originals concurrently. Visible queue reservations must include normalization.
- [ ] Extend benchmark report to use success-only latency and successful requests/second:

```python
successful = [r for r in results if 200 <= r[0] < 300]
success_latency = [r[1] for r in successful]
successful_rps = len(successful) / elapsed_seconds
success_p95 = percentile(success_latency, 0.95) if success_latency else None
```

- [ ] Test mixed results: many immediate 429 responses plus slow 200 responses must not look like low successful P95. Keep total status distribution separately. Catch transport failures in benchmark so a single timeout doesn't erase the report.
- [ ] Parameterize existing runtime queue test for queue_limit 1 and 3: one active plus configured waiting count admitted; next rejected; timeout keeps CPU slot reserved until work exits.
- [ ] In staging only, use queue 3 / recognition timeout 15s, Laravel timeout 20s, shared max request images 3. Keep discovery concurrency five and its 30s/45s timeouts. Validate 15s against real three-photo requests before promotion; if it fails, record measured requirement rather than hiding overload with a longer queue.
- [ ] Benchmark real catalog photos at 768 and 1280 px with one vs several visible items; record match accuracy, quantity errors, OCR frequency, upload time, detector/encoder/OCR durations, success P50/P95, 429, CPU and RSS.
- [ ] Run 1/5/10/20 concurrent-user scenarios with a stated photo cadence (e.g. one every five seconds), plus burst of ten photos/device. Existing benchmark is closed-loop; add a paced arrival scenario in existing benchmark for sustainable-load measurement, record scheduled/start/success times, and do not treat fast rejections as achieved capacity.
- [ ] On future 6-core/8-GB staging machine, compare one/two one-worker replicas; measure total process memory and aggregate provider concurrency. Do not change model/provider, number of CPU threads, and replicas simultaneously.
- [ ] Record evidence and selected settings in runbook. No production load testing or deployment in this task without the applicable execution authorization.

## Task 6 — Verification, cleanup, and handoff

- [ ] Run sisko-plan checks:

```sh
php artisan test --filter=ProductScannerEndpointTest
composer ci:check
php artisan test --parallel --processes=10
npm run i18n:check
npm run build
```

- [ ] Run intelligence-service checks if its benchmark/tests change:

```sh
uv run --group dev pytest
uv run --group dev ruff check .
uv run --group dev ruff format --check .
```

- [ ] Browser QA spec acceptance cases at 320/375/640/768/1024/1280/1536 px, and actual Android Chrome/iPhone Safari where available. Explicitly report unavailable device verification rather than claiming it passed.
- [ ] Use realistic delayed/offline/429/late-response conditions; verify media tracks stopped on close/background, no accidental duplicate add, and no keyboard focus loss when returning to a form.
- [ ] Review every added callback/method/type against its active caller and boundary. Remove obsolete bestResult, destructive capture merge, auto-review effects, one-photo-product-close path, and replaced callback contracts. Preserve active BarcodeScannerDialog uses for targeted product/variant fields; consolidate only if replacement covers each caller.
- [ ] Review final diff for secrets, unrelated UI changes, new dependencies/endpoints, global quota disabling, silent inventory adjustments, and speculative persistence.
- [ ] Summarize implemented behavior, measured capacity, tests, and unverified hardware/browser limitations. User reviews the runnable result before any separately authorized production deployment.

## Self-review of this plan

- Sesi reopen sebelum dan sesudah commit dijelaskan terpisah; hasil lama tidak dimasukkan lagi.
- Batas sepuluh menghitung foto, bukan barang, dan kelompok discovery dapat ditutup saat kapasitas penuh.
- Recognition multi-item tidak dipaksakan ke discovery single-product.
- Target barcode, retake photo, dan additive barcode memiliki akibat berbeda dan identitas eksplisit.
- Retry otomatis dibatasi pada kapasitas dan bergantung pada Task 1; kuota/throttle tidak dimatikan.
- Tidak ada model, service, atau dependency baru. Callback tambahan memiliki pemanggil aktif dan tanggung jawab yang disebutkan.
- Kapasitas produksi dan akurasi tetap perlu pengukuran; dokumen ini bukan hasil benchmark.
