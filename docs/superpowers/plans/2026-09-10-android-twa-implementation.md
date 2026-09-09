# XSISTEN Android TWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the existing online customer portal as a Play Store-ready Android TWA that starts at login/customer pages and shows a branded offline fallback.

**Architecture:** Laravel/Inertia remains the only application implementation. A minimal PWA shell and verified TWA distribute `https://xsisten.com`; no mobile API, duplicated frontend, or offline business data is introduced.

**Tech Stack:** Laravel 13, Inertia 3, React 19, service worker, Web App Manifest, Bubblewrap 1.25.0, Android Browser Helper, Android API 36.

**Spec:** `docs/superpowers/specs/2026-09-10-android-twa-design.md`

## Global Constraints

- Application ID: `com.xsisten.app`; app name: `XSISTEN`; production origin: `https://xsisten.com`.
- Online-only: cache only the self-contained offline fallback, never authenticated HTML, Inertia responses, form requests, or customer data.
- Keep landing `/` unchanged for normal browsers; TWA starts at `/app`.
- Keep all secrets and keystores outside Git.
- Target Android 16 / API 36 and produce an AAB.

---

### Task 1: Customer App Entry

**Files:**
- Create: `tests/Feature/AndroidAppEntryTest.php`
- Modify: `routes/public.php`

**Interfaces:**
- Produces: named `GET /app` route `app.entry`.

- [ ] Write tests proving a guest is redirected to `login` and an authenticated customer is redirected to `dashboard`.
- [ ] Run `php artisan test --compact tests/Feature/AndroidAppEntryTest.php` and confirm the tests fail because `app.entry` is absent.
- [ ] Add the direct route closure; let existing dashboard middleware handle verification, store selection, and subscription access.
- [ ] Rerun the test and `php artisan route:list --name=app.entry`.

Expected implementation shape:

```php
Route::get('app', fn () => auth()->check()
    ? to_route('dashboard')
    : to_route('login'))->name('app.entry');
```

### Task 2: Minimal PWA and Offline Fallback

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/offline.html`
- Create: `public/service-worker.js`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`
- Create: `tests/Feature/PwaShellTest.php`
- Modify: `resources/views/app.blade.php`
- Modify: `resources/js/app.tsx`

**Interfaces:**
- Produces: installable manifest with `start_url: "/app"`; service worker cache `xsisten-offline-v1`.

- [ ] Test manifest status/content type, `/app` start URL, required 192/512 icons, and offline/service-worker availability.
- [ ] Run `php artisan test --compact tests/Feature/PwaShellTest.php` and confirm missing-asset failures.
- [ ] Generate square regular and maskable icons from the existing XSISTEN icon; visually inspect padding and transparency.
- [ ] Add manifest metadata and theme color to `app.blade.php`.
- [ ] Register `/service-worker.js` only when `import.meta.env.PROD` is true; registration failure must remain non-fatal.
- [ ] Implement a service worker that precaches only `/offline.html`, uses network for navigation, and returns the fallback only when navigation fetch fails.
- [ ] Run the focused tests, `npm run types:check`, and `npm run build`.

Service-worker invariant:

```js
if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
}
```

### Task 3: Verified TWA Project

**Files:**
- Create: `android-twa/twa-manifest.json`
- Create: generated Android Browser Helper project under `android-twa/`
- Create after key generation: `public/.well-known/assetlinks.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: deployed `https://xsisten.com/manifest.webmanifest`.
- Produces: API-36 Android project and Digital Asset Link for `com.xsisten.app`.

- [ ] Ignore keystore files, signing property files, APKs, AABs, and generated secret material before generating keys.
- [ ] Deploy/stage Task 1–2 so Bubblewrap can read the production manifest.
- [ ] Run `npx @bubblewrap/cli@1.25.0 init --manifest=https://xsisten.com/manifest.webmanifest` inside `android-twa/`, selecting package `com.xsisten.app` and start URL `https://xsisten.com/app`.
- [ ] Set compile/target SDK to 36 and verify no unnecessary Android permissions are declared.
- [ ] Generate the upload keystore outside the repository and obtain its SHA-256 fingerprint with `keytool -list -v`.
- [ ] Add `assetlinks.json` for the upload fingerprint; after Play creates the App Signing key, add that fingerprint as a second allowed fingerprint.
- [ ] Validate `https://xsisten.com/.well-known/assetlinks.json` and confirm launch has no browser toolbar.
- [ ] Build the release AAB with Bubblewrap and retain it outside Git.

### Task 4: Device and Regression Verification

**Files:**
- Modify only if failures require scoped fixes in existing customer/auth code.

- [ ] Run `composer run ci:check` and fix only regressions caused by this change.
- [ ] Install through Play internal testing on a real Android device.
- [ ] Verify login, registration, reset, verification, logout, session expiry, Google Login round-trip, Android Back, and external links.
- [ ] Verify dashboard, store selection, POS submission, product camera/barcode, gallery upload, all customer navigation, rotation, and keyboard behavior.
- [ ] Test cold start and navigation while offline: show branded fallback, never a blank screen, never report a mutation as successful.
- [ ] Test slow network and server 4xx/5xx behavior; preserve the existing error UI.

### Task 5: Play Store Release Gate

**Files:**
- No application source changes unless validation identifies a defect.

- [ ] Enable Play App Signing and update deployed Digital Asset Links with its SHA-256 fingerprint.
- [ ] Complete privacy policy, Data safety, content rating, target audience, app access/reviewer credentials, support contact, and account-deletion declarations.
- [ ] Upload icon, feature graphic, phone screenshots, and the signed API-36 AAB.
- [ ] Complete internal/closed testing, inspect pre-launch report, resolve crashes/security findings, then promote the same artifact to production.
- [ ] Perform final diff review: no Capacitor/Flutter/API/offline-data code, no committed secrets, and no unrelated refactor.

## Final Verification

```bash
php artisan test --compact tests/Feature/AndroidAppEntryTest.php tests/Feature/PwaShellTest.php
npm run lint:check
npm run format:check
npm run types:check
npm run test:units
npm run build
composer run test
git diff --check
git status --short
```

Do not claim Play Store readiness until the release AAB is installed through internal testing, Digital Asset Links is verified with the Play signing fingerprint, and the device smoke checklist passes.
