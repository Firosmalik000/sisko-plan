# Phase — WhatsApp Limit Contact

## Status

Complete

## Goal

Keep public pricing available while replacing automatic limit upsells for store, staff, and scan capacity with a localized support modal that opens the platform WhatsApp contact.

## Repository State

Dirty worktree with existing subscription and locale work. Preserve all existing data and unrelated changes.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Existing Brand & SEO settings flow
- [x] Existing subscription capacity service and UI limit entry points
- [x] Existing shared Inertia branding contract
- [x] Relevant platform-setting and scanner tests
- [x] UI/UX skill guidance

## Scope

- Reuse `platform_settings.brand_name` and `support_phone`; no schema change.
- Add one reusable localized capacity-contact dialog.
- Replace automatic pricing navigation only at exhausted store, staff, and scan limit entry points.
- Keep `/pricing` and manual pricing access unchanged.
- Clarify the Brand & SEO support phone field as the WhatsApp destination.

## Business Rules

- Server-side capacity enforcement remains authoritative.
- The WhatsApp message and modal copy follow the current locale (`id`, `en`, `ms`, `vi`).
- The platform name is always read from shared branding.
- A missing/invalid support number must not produce a broken external link.

## Database Changes

None. Existing nullable `support_phone` is reused, preserving production data.

## Testing Strategy

- Focused platform-setting and subscription/scanner feature tests.
- TypeScript, scoped ESLint, formatter, production build, diff check.
- Browser verification at 320, 375, 640, 768, 1024, 1280, and 1536px.

## Implementation Milestones

- [x] Repository audit
- [x] Reusable contact dialog
- [x] Store/staff/scan integration
- [x] Brand & SEO copy update
- [x] Automated checks
- [x] Responsive verification
- [x] Diff review

## Progress Log

- 2026-09-10: Confirmed `brand_name` and `support_phone` are already persisted and globally shared; no migration or backfill is required.
- 2026-09-10: Added one localized dialog for store, staff, and scan limits, replaced automatic pricing redirects at exhausted-limit actions, and clarified the existing support phone as WhatsApp support.

## Verification Results

- TypeScript passed with `npm run types:check`.
- Production build passed with `npm run build`.
- Focused brand setting, scan quota, and account store-limit tests passed (3 tests, 67 assertions).
- Scoped Prettier and ESLint passed.
- Browser loaded the customer store page without horizontal overflow at 320, 375, 640, 768, 1024, 1280, and 1536px.
- Static inspection confirms exhausted store/staff/scan actions no longer link directly to pricing; manual pricing links remain for non-exhausted capacity cards and the public page remains available.
- `git diff --check` passed.

## Remaining Risks and Limitations

- The current local demo account was below all limits, so the actual exhausted-state modal could not be opened without mutating shared local subscription data. The dialog contract, integration, type checks, and build were verified without changing that data.
- The full `PlatformSettingTest` contains two pre-existing environment/locale-sensitive failures unrelated to this change; the directly affected Brand & SEO update test passes.
