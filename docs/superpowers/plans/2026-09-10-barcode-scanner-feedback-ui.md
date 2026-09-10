# Barcode Scanner Feedback UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both barcode camera flows obviously automatic, show scanning progress inside the camera frame, and remove photo controls that are misleading in barcode mode.

**Architecture:** Keep `useCamera` and its existing two-frame barcode confirmation unchanged. Add one small presentation module that owns the shared barcode status, message, and visual tone; both scanner surfaces consume it. The barcode-only dialog becomes auto-scan-first with gallery fallback, while the mixed product scanner keeps capture controls only in photo mode.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS 4, Lucide React, Node built-in test runner, existing `BarcodeDetector`/`zxing-wasm` pipeline.

**Spec:** In-chat bounded design approved on 2026-09-10: barcode form scanner auto-detects and closes after feedback; mixed scanner retains shutter/auto-capture only for photo mode and auto-detects in barcode mode.

## Global Constraints

- Do not add a dependency or a new service/component layer.
- Preserve `useCamera` detection cadence and its two-matching-frame false-positive protection.
- Barcode status must be communicated by text/icon as well as color.
- Keep touch targets at least 44px and preserve visible keyboard focus.
- New Indonesian interface strings must be translated in the existing English, Malay, and Vietnamese catalogs.
- Do not use Playwright; verify through unit tests, lint, TypeScript, formatting, and the production build.

---

## File Map

- Create `resources/js/components/product-scanner/barcode-scanner-feedback.ts`: canonical barcode status type and presentation mapping shared by both scanner surfaces.
- Create `tests/Frontend/barcode-scanner-feedback.test.mjs`: unit coverage for every status and its accessible text/tone.
- Modify `resources/js/components/product-scanner/BarcodeScannerDialog.tsx`: barcode-only auto-scan feedback, short success acknowledgement, and gallery-only fallback.
- Modify `resources/js/components/product-scanner/CameraViewport.tsx`: stateful barcode frame and mode-specific controls.
- Modify `resources/js/components/product-scanner/ProductScanner.tsx`: use the shared status type and pass the current status to the viewport without changing lookup behavior.
- Modify `resources/js/lang/en/application.ts`, `resources/js/lang/ms/application.ts`, and `resources/js/lang/vi/index.ts`: translations for new scanner feedback and fallback labels.

### Task 1: Establish the shared barcode feedback contract

**Files:**
- Create: `resources/js/components/product-scanner/barcode-scanner-feedback.ts`
- Create: `tests/Frontend/barcode-scanner-feedback.test.mjs`

**Interfaces:**
- Produces: `BarcodeScanStatus = 'scanning' | 'reading' | 'success' | 'not_found'`
- Produces: `barcodeScannerFeedback(status): { message: string; tone: 'active' | 'progress' | 'success' | 'warning' }`
- Consumes: no scanner implementation details or React state.

- [ ] **Step 1: Write the failing status-mapping test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { barcodeScannerFeedback } from '../../resources/js/components/product-scanner/barcode-scanner-feedback.ts';

test('barcode scanner feedback gives every state explicit text and tone', () => {
    assert.deepEqual(barcodeScannerFeedback('scanning'), {
        message: 'Mencari barcode…',
        tone: 'active',
    });
    assert.deepEqual(barcodeScannerFeedback('reading'), {
        message: 'Barcode terbaca, mencari produk…',
        tone: 'progress',
    });
    assert.deepEqual(barcodeScannerFeedback('success'), {
        message: 'Berhasil. Barcode ditemukan.',
        tone: 'success',
    });
    assert.deepEqual(barcodeScannerFeedback('not_found'), {
        message: 'Kode terbaca, tetapi produk belum ada di katalog.',
        tone: 'warning',
    });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `npm run test:units -- --test-name-pattern="barcode scanner feedback"`

Expected: FAIL because `barcode-scanner-feedback.ts` does not exist.

- [ ] **Step 3: Implement the minimal canonical mapping**

```ts
export type BarcodeScanStatus = 'scanning' | 'reading' | 'success' | 'not_found';

type BarcodeScannerFeedback = {
    message: string;
    tone: 'active' | 'progress' | 'success' | 'warning';
};

const feedbackByStatus: Record<BarcodeScanStatus, BarcodeScannerFeedback> = {
    scanning: { message: 'Mencari barcode…', tone: 'active' },
    reading: { message: 'Barcode terbaca, mencari produk…', tone: 'progress' },
    success: { message: 'Berhasil. Barcode ditemukan.', tone: 'success' },
    not_found: { message: 'Kode terbaca, tetapi produk belum ada di katalog.', tone: 'warning' },
};

export function barcodeScannerFeedback(status: BarcodeScanStatus): BarcodeScannerFeedback {
    return feedbackByStatus[status];
}
```

- [ ] **Step 4: Run the focused test**

Run: `npm run test:units -- --test-name-pattern="barcode scanner feedback"`

Expected: PASS with one matching test.

- [ ] **Step 5: Commit the contract**

```bash
git add resources/js/components/product-scanner/barcode-scanner-feedback.ts tests/Frontend/barcode-scanner-feedback.test.mjs
git commit -m "test: define barcode scanner feedback states"
```

### Task 2: Make the form barcode scanner fully auto-scan-first

**Files:**
- Modify: `resources/js/components/product-scanner/BarcodeScannerDialog.tsx`
- Modify: `resources/js/lang/en/application.ts`
- Modify: `resources/js/lang/ms/application.ts`
- Modify: `resources/js/lang/vi/index.ts`

**Interfaces:**
- Consumes: `BarcodeScanStatus` and `barcodeScannerFeedback()` from Task 1.
- Preserves: `BarcodeScannerDialogProps` and `onDetected(value)` behavior.
- Produces: no new public API.

- [ ] **Step 1: Replace the implicit scan state with the canonical status**

Add `const [barcodeStatus, setBarcodeStatus] = useState<BarcodeScanStatus>('scanning')`. Reset it to `scanning` whenever the dialog opens or a retry begins.

In `handleDetected`, set `reading` before `onDetected`. On success, set `success`, play the existing vibration feedback, wait approximately 450ms so the acknowledgement is perceivable, then close. On rejection, set `not_found`, show the actionable error, and release `handledRef` for another attempt.

- [ ] **Step 2: Put status feedback inside the barcode frame**

Use `barcodeScannerFeedback(barcodeStatus)` to render an `aria-live="polite"` status chip inside the frame. Keep the current horizontal barcode-shaped frame, but map its border/corner treatment to the feedback tone:

```tsx
const feedback = barcodeScannerFeedback(barcodeStatus);

<div data-tone={feedback.tone} className={frameClassName}>
    <div role="status" aria-live="polite" className={statusChipClassName}>
        {barcodeStatus === 'success' ? <Check /> : barcodeStatus === 'reading' ? <LoaderCircle /> : <ScanBarcode />}
        {translate(feedback.message)}
    </div>
</div>
```

Use orange for `active/progress`, green plus a check icon for `success`, and amber plus readable text for `warning`. Stop the scan-line animation during `reading`, `success`, and `not_found`; motion must honor `motion-reduce`.

- [ ] **Step 3: Remove the redundant camera shutter**

Delete `readFromCamera`, the `Ambil foto` button, and the now-unused `Camera` import used by that button. Keep one secondary full-width gallery action labeled `Pilih foto barcode`; while decoding, change it to `Membaca foto…` with the existing spinner.

Do not hide the gallery fallback behind a timer: it remains discoverable for denied camera access, damaged autofocus, and saved barcode images.

- [ ] **Step 4: Add translations for new visible copy**

Add exact catalog entries for:

- `Mencari barcode…`
- `Berhasil. Barcode ditemukan.`
- `Pilih foto barcode`
- `Membaca foto…`

Keep terminology aligned with each existing locale catalog; do not introduce new translation files.

- [ ] **Step 5: Run focused and static verification**

Run: `npm run test:units -- --test-name-pattern="barcode scanner feedback"`

Expected: PASS.

Run: `npm run types:check`

Expected: exit 0 with no TypeScript errors or unused imports.

- [ ] **Step 6: Commit the barcode-only flow**

```bash
git add resources/js/components/product-scanner/BarcodeScannerDialog.tsx resources/js/lang/en/application.ts resources/js/lang/ms/application.ts resources/js/lang/vi/index.ts
git commit -m "feat: clarify automatic barcode field scanning"
```

### Task 3: Separate photo and barcode controls in the mixed product scanner

**Files:**
- Modify: `resources/js/components/product-scanner/CameraViewport.tsx`
- Modify: `resources/js/components/product-scanner/ProductScanner.tsx`

**Interfaces:**
- Consumes: `BarcodeScanStatus` and `barcodeScannerFeedback()` from Task 1.
- Preserves: `CameraViewport` callbacks and the existing `ProductScanner` lookup/confirmation flow.
- Changes internally: replace local status value `idle` with canonical `scanning`.

- [ ] **Step 1: Adopt the shared barcode status type**

In `ProductScanner.tsx`, type `barcodeStatus` as `BarcodeScanStatus`, initialize/reset it to `scanning`, and leave the existing transitions intact:

```ts
scanning -> reading -> success
scanning -> reading -> not_found
```

Do not change `handleBarcode`, its 1.2-second busy window, successful sale/purchase confirmation, sound, vibration, quota errors, or review routing.

- [ ] **Step 2: Make the camera frame match the selected mode**

In `CameraViewport.tsx`:

- Keep the current `4/3` frame and orange corner marks in photo mode.
- Use a wider barcode-shaped frame in barcode mode.
- Render the shared status chip inside the barcode frame.
- Change frame border/corner color for `reading`, `success`, and `not_found` using the same tone rules as the barcode-only dialog.
- Keep textual status below the frame only for actionable details such as lookup failure or quota exhaustion; remove the duplicate generic status paragraph once the in-frame status exists.

- [ ] **Step 3: Render controls by mode instead of disabling irrelevant controls**

In photo mode, preserve:

- `Foto barang / Barcode` segmented control
- `Auto aktif / Auto jeda`
- gallery button
- large shutter button
- `Hasil` button

In barcode mode:

- preserve the segmented control
- hide the photo auto-capture button instead of showing it disabled
- hide the large shutter button
- keep gallery as a fallback
- keep `Hasil` for sessions that can accumulate results
- keep torch and close controls

When `barcodeStatus === 'not_found'` and `onManualSearch` exists, expose one `Cari manual` action next to the error/status area. Do not add another modal.

- [ ] **Step 4: Correct accessible labels and state announcements**

Ensure the large capture button is only rendered in photo mode with `aria-label="Ambil foto"`. The barcode frame status uses `role="status"` and `aria-live="polite"`; quota/lookup errors keep `role="alert"`. The decorative frame remains hidden from assistive technology, but the status child must not sit inside an `aria-hidden="true"` ancestor.

- [ ] **Step 5: Run the full frontend verification set**

Run: `npm run test:units`

Expected: all frontend unit tests PASS.

Run: `npm run format:check`

Expected: exit 0. If it fails only for touched files, run `npx prettier --write` on the touched files and rerun the check.

Run: `npm run lint:check`

Expected: exit 0 with no ESLint findings.

Run: `npm run types:check`

Expected: exit 0 with no TypeScript errors.

Run: `npm run i18n:check`

Expected: exit 0 with no missing translation entries for the new strings.

Run: `npm run build`

Expected: Vite production build completes successfully.

- [ ] **Step 6: Review the final diff for simplicity and regressions**

Run: `git diff --check`

Then inspect `git diff -- resources/js/components/product-scanner tests/Frontend resources/js/lang`. Confirm:

- no pass-through wrapper or unused public API was added
- status data has one canonical representation
- no manual barcode shutter remains
- photo capture behavior is unchanged
- `useCamera` detection behavior is unchanged
- no unrelated files were modified

- [ ] **Step 7: Commit the mixed scanner UI**

```bash
git add resources/js/components/product-scanner/CameraViewport.tsx resources/js/components/product-scanner/ProductScanner.tsx
git commit -m "feat: simplify mixed camera scanner controls"
```
