# Market-aware language switching

## Status

Complete

## Goal

Separate market selection from UI language so public and platform-admin pages
select Indonesia or Malaysia, while customer pages offer the selected market's
local language plus English without changing IDR/MYR.

## Repository State

The application currently supports `id` and `ms` through one session locale.
Currency is inferred directly from that locale, and the UI literal compiler is
audited only for Malay output.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Business rules
- [x] Architecture
- [x] Security and tenancy
- [x] Testing and quality
- [x] Existing locale tests

## Dependencies and Prerequisites

- Laravel session middleware and Inertia shared props.
- Existing runtime UI translation compiler.
- Existing centralized currency helpers.

## Scope

- Session-backed `id`/`ms` market selection.
- Context-aware public/platform and customer language options.
- English customer UI and server messages.
- Market-aware IDR/MYR formatting independent of English selection.
- Automated hard-coded UI text audit for Malay and English.

## Out of Scope

- Currency conversion and exchange rates.
- Translating tenant-entered data such as product, store, and customer names.
- Persisting market preferences to database accounts.

## Business Rules

- Public and platform-admin surfaces offer Indonesia and Melayu.
- Indonesia customer surfaces offer Indonesian and English with IDR/Rp.
- Malaysia customer surfaces offer Malay and English with MYR/RM.
- English never changes the selected market or currency.

## Architecture Decisions

- Store `market` and `locale` separately in session.
- Resolve effective locale by portal context in middleware.
- Share market and allowed locales through Inertia.
- Keep monetary values unchanged; formatting reads market independently.

## Database Changes

None.

## Backend Changes

- Validate market-aware locale updates.
- Resolve public/platform and customer locale rules.
- Add English server translation coverage and feature tests.

## Frontend Changes

- Make the shared switcher context-aware.
- Synchronize document locale and market on Inertia navigation.
- Extend runtime translation and currency helpers for English.

## Security and Tenancy Review

Locale and market are presentation-only session values. They do not affect
tenant selection, authorization, stored amounts, or ledger calculations.

## Transaction and Concurrency Strategy

No database writes. Each browser session owns its market and locale values.

## Testing Strategy

- Feature tests for public/platform and both customer market combinations.
- Server translation parity checks.
- UI literal audit for Malay and English.
- TypeScript, lint, formatter, production build, and responsive browser checks.

## Implementation Milestones

- [x] Repository audit
- [x] Backend market and locale contract
- [x] Frontend switcher and currency behavior
- [x] English UI and server translation coverage
- [x] Automated static checks
- [x] Responsive verification
- [x] Diff review

## Progress Log

- 2026-09-05: Traced locale route, middleware, Inertia props, switcher usage,
  currency helpers, server catalogs, and UI literal build transform.
- 2026-09-05: Separated market from locale, added context-aware switchers,
  English customer UI, market-aware currency formatting, and server messages.
- 2026-09-05: Split frontend catalogs into `lang/id`, `lang/ms`, and `lang/en`
  by common, public, application, reviewed, and lexicon responsibilities.
- 2026-09-05: Removed unused mobile menu helper metadata and preserved the
  compact cashier sheet implementation.
- 2026-09-05: Browser QA found and fixed a logged-in customer leaking English
  locale into the public landing page.
- 2026-09-05: Reworked Indonesian-sounding Malay copy into natural Malaysian
  UI language across public, customer, purchasing, reports, sales, scanner,
  subscription, security, and server validation messages.
- 2026-09-05: Extended the i18n audit to reject Indonesian-only terms in both
  rendered Malay UI output and `lang/ms.json` server messages.

## Discoveries and Deviations

- Currency currently depends on locale, so English requires a separate market.
- The existing build audit covers Malay but does not validate English output.
- Authentication alone cannot identify the current portal because a customer
  may visit public pages while logged in. Public route names and an explicit
  switcher context now determine the correct locale contract.

## Commands Executed

- Repository searches and targeted source inspection with `rg` and
  `Get-Content`.
- `npm run format`
- `npm run format:check`
- `npm run lint:check`
- `npm run types:check`
- `npm run i18n:check`
- `npm run build`
- `git diff --check`
- Browser verification through the local HTTPS application.

## Verification Results

- TypeScript completed with no errors.
- ESLint completed with no errors or warnings.
- Prettier check completed successfully.
- I18n audit covered 2,447 UI literal occurrences with Malay and English
  output coverage.
- Production Vite build completed successfully with 3,813 transformed modules.
- Public Malaysia market renders Malay and RM, including the full landing page.
- Malaysia customer portal offers Malay and English; English preserves RM.
- Indonesia customer portal offers Indonesian and English; Indonesian uses Rp.
- A customer English preference no longer leaks into the public market pages.
- Customer dashboard has no horizontal overflow at 320, 375, 640, 768, 1024,
  1280, or 1536 pixels.
- Public landing, customer dashboard, and sales history have no horizontal
  overflow at 320, 375, 640, 768, 1024, 1280, or 1536 pixels after the Malay
  copy refinement.
- Browser checks confirmed natural Malay labels on product, purchasing,
  reporting, and sales pages, MYR formatting, and no console errors.
- UI detector reported only existing advisory compact type sizes; no blocking
  defect was reported.

## Remaining Risks and Limitations

- PHPUnit locale tests could not be rerun because no PHP executable is
  available to the Codex shell. The equivalent public/customer market flows
  were exercised against the running local Laravel application in a browser.
- The latest production build attempt could not regenerate Wayfinder types:
  the only PHP CLI found is 8.3.30 while Composer requires PHP 8.4.1. The
  earlier production build remains the latest successful full build.
- The Vite build continues to report the existing optional `fontaine` package
  warning; it does not fail the build.

## Completion Summary

Market and language are now independent, context-aware, and covered by static
auditing. Frontend catalogs are organized by locale and responsibility, public
and platform surfaces use Indonesia/Melayu, customer portals use the selected
market language plus English, and currency remains tied to the market.
