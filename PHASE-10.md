# Phase 10 — Flexible Subscription Entitlements

## Status

Complete

## Goal

Replace the default trial offer with an account-scoped free-forever plan and add flexible store, product, staff, and monthly scan entitlements that can be extended through add-on offers.

## Repository State

The worktree contains unrelated in-progress changes. This phase preserves them and limits edits to subscription provisioning, entitlement enforcement, scanner usage, offer management, pricing, and subscription presentation.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase file
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing relevant tests

## Scope

- Free-forever default plan provisioned on standard and Google registration.
- Base-plan and add-on offer types in the existing plan management form.
- Fixed-term and lifetime validity.
- Account-wide store, product, staff, and monthly scan entitlements.
- Add-on confirmation through the existing pricing subscription action.
- Categorized add-on placement for store, staff, product, scan, and general bundle offers.
- Contextual upgrade actions at store, staff, product, and scanner capacity limits.
- Monthly scanner usage enforcement and subscription usage visibility.
- Existing canonical trial subscriptions converted to the free plan without deleting history.
- Every existing non-platform account backfilled to the free plan, including accounts without a store.
- Retired base offers removed when unused and retained inactive when referenced by history.
- Inactive starter add-ons seeded for one store, one staff seat, and 100 monthly scans.

## Out of Scope

- Payment gateway collection, invoices for add-ons, proration, refunds, and automatic recurring charges.

## Business Rules

- One owner account has one base subscription shared by all owned stores.
- Add-ons increase entitlements and never replace the base subscription.
- A focused add-on category must match exactly one capacity; multi-capacity offers use the general category.
- A zero base limit means unlimited; a zero add-on value contributes no additional capacity.
- Scanner usage is counted per owner account and resets each calendar month in Asia/Jakarta.
- Trial metadata remains available for future use, but no trial offer is active by default.
- The default free plan has no expiry and starts with 1 store, 1 staff, and 100 scans per month.

## Database Changes

- Add offer kind, billing cycle, and scan limit to plans.
- Add account subscription add-ons with immutable entitlement snapshots.
- Add indexed offer categories to plans and immutable category snapshots to add-on activations; existing rows are backfilled from their capacity shape.
- Add monthly scan counters and server-issued scan usage events.
- Add an idempotent account backfill that cancels queued legacy periods and preserves restricted account states.

## Security and Tenancy Review

- Entitlements resolve through the active store owner, never browser-supplied account IDs.
- Scan counters are account-scoped and updated transactionally.
- Plan and add-on administration keeps existing platform permissions and audit boundaries.

## Transaction and Concurrency Strategy

- Lock the owner and monthly counter during scan consumption.
- Use server-issued request keys so clients cannot bypass quota by replaying an idempotency key.
- Create add-ons and their audit records atomically.

## Testing Strategy

- Migration/backfill, registration provisioning, add-on accumulation, store/staff limits, monthly scan reset, quota rejection, pricing selection, validation, and responsive UI checks.

## Verification Results

- Focused subscription, registration, and scanner suite: 40 tests, 491 assertions passed.
- Final subscription migration regression: 29 tests, 426 assertions passed, including preservation of suspended accounts.
- Google authentication regression suite: 11 tests, 77 assertions passed.
- Full application suite: 289 tests, 2,636 assertions passed.
- Final backfill and registration suite: 32 tests, 448 assertions passed.
- Targeted backfill eligibility test: 1 test, 16 assertions passed, including exclusion of staff-only users.
- Jakarta month-boundary scanner regression: 9 tests, 58 assertions passed after the timezone hardening.
- TypeScript type check passed.
- ESLint passed for every changed subscription and scanner UI file.
- Prettier check passed for every changed subscription and scanner UI file.
- Production Vite build passed.
- Add-on category regression passed as part of 32 subscription tests and 469 assertions.
- Local backfill verified: the base category is null, starter add-ons resolve to store, staff, and scan, and no existing add-on activation has a null category.
- Migration `2026_09_11_000000_add_offer_categories_to_subscription_addons` ran locally through ordinary `migrate`, without resetting data.
- Impeccable UI detector returned no findings after remediation.
- Migration status confirms `2026_09_09_000000_add_flexible_subscription_entitlements` ran locally; the canonical default plan is `Gratis Selamanya`, lifetime, non-trial, with 1 store, 1 staff, and 100 monthly scans.
- Migration status confirms `2026_09_10_000000_backfill_free_subscriptions_and_seed_addons` ran locally. The remaining offer catalog is one active free base plan and three inactive starter add-ons awaiting admin pricing.
- Test bootstrap now refuses to run unless it detects `APP_ENV=testing`, SQLite, and `:memory:` before database-refresh traits execute.
- Responsive source audit covered 320, 375, 640, 768, 1024, 1280, and 1536 px for pricing cards, management forms/dialogs, subscription cards, wrapping, responsive grids, and horizontal overflow. Live browser capture was unavailable because the browser automation allowance was exhausted; no browser-only success is claimed.
- `git diff --check` passed, and the scoped diff review found no debug output, generated artifacts, or changes outside the subscription/scanner implementation.

## Completion Summary

New accounts now receive one account-scoped free-forever base subscription before their first store exists. Base offers can be fixed-term or lifetime, add-on offers are categorized and stack immutable category/capacity snapshots, contextual limit states route customers to the matching offer, paid renewals queue after the active period, upgrades from the free lifetime plan begin immediately, trial history remains accurate, and store/product/staff/scan limits resolve across every store owned by the account.

## Remaining Risks and Limitations

- During verification, a pre-existing cached `local` configuration caused PHPUnit's database refresh trait to run against the local MySQL database. The local application database now contains no users or stores. Binary logging, general logging, Windows shadow copies, and project/DBngin dumps were unavailable, so automatic recovery is not possible; restoration requires an external database backup if one exists.
- A hard fail-safe now blocks all project tests unless the runtime is `testing` with SQLite `:memory:` before database refresh traits execute.
