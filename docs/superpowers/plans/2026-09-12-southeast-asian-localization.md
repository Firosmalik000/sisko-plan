# Southeast Asian Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver complete ten-locale localization for all eleven Southeast Asian markets with natural English source copy and verified frontend/backend coverage.

**Architecture:** Keep market and locale independent, centralize valid locale codes, use canonical English messages plus stable semantic reference-data keys, and load one frontend locale chunk at a time. Laravel continues to own server-rendered messages while React owns browser copy.

**Tech Stack:** Laravel 12, PHP 8.4, Inertia 3, React 19, TypeScript 5.7, Vite 8, PHPUnit, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-12-southeast-asian-localization-design.md`

## Global Constraints

- Work directly on `main` as explicitly authorized, preserve existing dirty changes, and do not commit.
- Do not touch the mobile worktree.
- Add no application dependency or database multilingual columns.
- Keep one canonical representation for locale codes and one translation resolver per runtime.
- Remove superseded literal-source fallbacks after migration.
- Do not use Playwright or other browser automation.

---

### Task 1: Canonical locale registry

**Files:**
- Create: `resources/js/lib/locales.ts`
- Modify: `app/Support/LocaleContext.php`
- Modify: `config/localization.php`
- Modify: `resources/js/lib/currency.ts`
- Modify: `resources/js/app.tsx`
- Modify: `resources/js/components/language-switcher.tsx`
- Modify: `resources/js/types/global.d.ts`
- Modify: `app/Http/Controllers/Sales/NativeReceiptController.php`
- Test: `tests/Unit/LocaleContextTest.php`
- Test: `tests/Feature/LocaleTest.php`
- Test: `tests/Frontend/currency-input.test.mjs`

- [ ] Add failing tests for the ten selectable locales and eleven market defaults.
- [ ] Run the focused PHPUnit and Node tests and confirm locale assertions fail.
- [ ] Introduce the canonical TypeScript locale tuple and update active consumers.
- [ ] Expand Laravel locale options and country defaults.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Canonical English frontend source and catalogs

**Files:**
- Modify: `resources/js/lib/i18n.ts`
- Modify: `resources/js/lang/**`
- Modify: active UI files under `resources/js/pages`, `resources/js/components`, `resources/js/layouts`, and `resources/js/hooks`
- Modify: `build/translate-ui.cjs`
- Modify: `build/audit-i18n.cjs`
- Test: `tests/Frontend/i18n-accounting-terms.test.mjs`

- [ ] Extend the i18n audit so every published locale must resolve every extracted message and preserve placeholders; run it and confirm it fails for missing locales.
- [ ] Build the canonical English message inventory from active render paths and existing reviewed catalogs.
- [ ] Rewrite source UI copy to natural English without changing technical discriminator values or user data.
- [ ] Re-key Indonesian, Malay, and Vietnamese catalogs to canonical English and generate domain-grouped catalogs for Filipino, Khmer, Lao, Burmese, Tetum, and Thai.
- [ ] Protect placeholders and retail terminology, then correct high-frequency navigation, action, error, POS, inventory, finance, and receipt copy in context.
- [ ] Remove regex, lexicon, and Indonesian-source compatibility behavior after the inventory has no active caller.
- [ ] Run `npm run i18n:check`, focused Node tests, type checking, and the production build.

### Task 3: Lazy locale loading and switch behavior

**Files:**
- Modify: `resources/js/lib/i18n.ts`
- Modify: `resources/js/app.tsx`
- Modify: `resources/js/components/language-switcher.tsx`
- Test: `tests/Frontend/i18n-locales.test.mjs`

- [ ] Write failing tests for catalog caching, English fallback, and all ten locale loaders.
- [ ] Run the focused Node test and confirm the expected failures.
- [ ] Load one non-English locale chunk before render or before an optimistic locale switch and cache it for the session.
- [ ] Keep English as the synchronous fallback and update `<html lang>` only with a valid locale.
- [ ] Run the focused tests, type checking, i18n audit, and build; inspect Vite output for separate locale chunks.

### Task 4: Backend catalog parity

**Files:**
- Modify: `lang/en.json`
- Modify: `lang/id.json`
- Modify: `lang/ms.json`
- Modify: `lang/vi.json`
- Create: `lang/fil.json`
- Create: `lang/km.json`
- Create: `lang/lo.json`
- Create: `lang/my.json`
- Create: `lang/tet.json`
- Create: `lang/th.json`
- Create or complete standard Laravel grouped files below each new locale.
- Test: `tests/Feature/LocaleTest.php`

- [ ] Expand the server parity test to ten locales and placeholder equivalence; run it and confirm missing-catalog failures.
- [ ] Create complete server message catalogs and standard validation/auth files for each locale.
- [ ] Verify representative validation, dynamic subscription, receipt, and API messages in every new locale.
- [ ] Run the focused Locale and receipt tests.

### Task 5: Completeness and final simplicity review

**Files:**
- Modify only files implicated by audit or failing verification.

- [ ] Run the AST UI audit and remove every uncovered user-facing literal or obsolete catalog key.
- [ ] Search for old four-locale unions, hard-coded locale arrays, Indonesian source-message calls, and duplicate fallback logic.
- [ ] Review every added public function and file; inline pass-through behavior and remove unused compatibility paths.
- [ ] Run formatter, frontend tests, PHPUnit, PHPStan, TypeScript, ESLint, i18n audit, and production builds.
- [ ] Inspect the complete diff and manually verify long-copy and narrow-screen behavior without browser automation.
