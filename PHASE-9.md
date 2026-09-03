# Phase 9 — Platform Brand and SEO Center

## Status

Implemented (verification limited)

## Goal

Give authorized platform administrators one place to manage the public brand identity, contact channels, dynamic social links, and default SEO metadata.

## Repository State

The repository contains unrelated in-progress user changes. This phase preserves them and limits edits to the platform settings flow and the minimum shared public metadata surfaces.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase file (`PHASE-9.md`)
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing relevant tests

## Dependencies and Prerequisites

- Unified platform-admin authentication and permissions.
- Admin audit log.
- Inertia shared props and public site shell.

## Scope

- Global logo, brand name, tagline, website, support email, and support phone.
- Add/remove up to 25 social links from a broad catalog while retaining custom platform names.
- Default home SEO title, description, keywords, social preview image, and indexing control.
- Platform permission, validation, audit log, and public metadata integration.

## Out of Scope

- Per-page SEO records, redirects, sitemap editing, analytics integrations, and per-store branding.

## Business Rules

- Settings are platform-global and never tenant-owned.
- Social and metadata URLs must use HTTP or HTTPS.
- Logos accept PNG, JPEG, or WebP files up to 2 MB; SVG is not accepted.
- Only explicitly authorized platform administrators may view or update settings.
- Every update is audited without storing unnecessary before/after content.

## Architecture Decisions

- A singleton `platform_settings` row stores the coherent settings snapshot.
- Logo files use server-generated names on private storage and a controlled public image route.
- Reads use safe application defaults if the singleton is unexpectedly absent.
- A single transactional update protects the record and audit entry.

## Database Changes

- Add `platform_settings` with one seeded singleton record and an additive nullable logo path migration.
- Add view/manage permissions and assign them to existing standard platform admins.

## Backend Changes

- Model, Form Requests, transactional logo replacement/removal, controlled image route, shared Inertia props, and server-rendered metadata.

## Frontend Changes

- Add a compact responsive Brand & SEO page in the super-admin portal.
- Add logo preview/upload/removal and a comprehensive social platform picker with custom input.
- Use the managed logo in the public shell and authenticated application identity with a fallback icon.

## UI/UX Implementation Rules

### Responsive Verification

Every frontend change must be verified at all of these viewport widths:

- [ ] `xs` — 320px (browser capture blocked; structural review only)
- [ ] `sx` — 375px (browser capture blocked; structural review only)
- [ ] `sm` — 640px (browser capture blocked; structural review only)
- [ ] `md` — 768px (browser capture blocked; structural review only)
- [ ] `lg` — 1024px (browser capture blocked; structural review only)
- [ ] `xl` — 1280px (browser capture blocked; structural review only)
- [ ] `2xl` — 1536px (browser capture blocked; structural review only)

### Interface Copy

- Keep labels direct, compact, and action-oriented.
- Use helper copy only for indexing consequences and URL constraints where it prevents errors.

## Security and Tenancy Review

- Platform-admin authentication, 2FA boundary, and separate view/manage permissions apply.
- Submitted platform-global data contains no tenant identifier.
- React renders text and URLs without untrusted HTML.
- Logo MIME/extension and size are validated; SVG is rejected and storage names are server-generated.
- Logo paths stay private; only the current configured logo is served publicly.

## Transaction and Concurrency Strategy

- Lock the seeded singleton row and write settings plus audit records in database transactions.
- Delete a newly stored logo if its database transaction fails; delete the replaced file only after commit.

## Testing Strategy

- Authorized view/update/upload/remove, unauthorized denial, file validation, replacement cleanup, public image serving, dynamic social replacement, metadata sharing, and audit persistence.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and migrations
- [x] Backend domain
- [x] Authorization and validation
- [x] Frontend
- [ ] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [x] Interface copy review (no unnecessary helper text)
- [x] Automated tests
- [x] Verification
- [x] Diff review
- [x] Documentation
- [x] Completion report

## Progress Log

- 2026-09-03: Enabled fail-fast database migrations for single-replica Dokploy web auto-deployments, restricted migration execution to the web role, and moved it ahead of Laravel optimization and server startup.

- 2026-09-01: Audited platform routes, permissions, audit patterns, shared props, public metadata, UI patterns, and tests.
- 2026-09-01: Added the singleton settings record, platform permissions, audited update flow, responsive admin form, dynamic social links, and public metadata integration.
- 2026-09-01: Verified focused tests, static analysis, types, formatting, an initial production build, and migration rollback/re-apply.
- 2026-09-02: Added secure logo upload/replacement/removal, managed logo rendering, 40+ channel choices, custom platform input, and a 25-link limit.
- 2026-09-02: Verified focused feature and permission tests, PHPStan, TypeScript, ESLint, Prettier, PHP lint, and additive migration up/rollback/up.
- 2026-09-02: Connected the managed logo to the tenant mobile header, standard dashboard drawer, and super-admin shell; desktop tenant sidebar already used the dynamic logo component.
- 2026-09-02: Replaced static Laravel favicon metadata with the managed logo for browser icons, Apple touch icon, application naming, and social-image fallback.
- 2026-09-03: Hardened production writes so pending schema and unwritable private storage return actionable form errors instead of generic HTTP 500 responses.

## Discoveries and Deviations

- Existing public pages carry hard-coded descriptions; the home description will be connected to the managed default while pricing keeps its page-specific copy.
- The in-app browser initially reached the local route, but a continued session was blocked by browser URL policy. No policy workaround was attempted; the seven required screenshot widths remain unverified.
- The browser-control runtime was not callable in the current tool session, so the new logo controls received structural responsive review but no new screenshots.
- Full-suite baseline failures remain outside this change: GD is unavailable for seven image tests, one proxy assertion uses a different local `APP_URL`, and one Malay validation assertion sends a payload that triggers the required-password message instead.
- An initial production build passed. A later rebuild, after concurrent unrelated changes appeared in `vite.config.ts`, failed inside the translation Babel plugin across 35 existing files. This phase does not alter or overwrite that work.

## Commands Executed

- Repository inspection with `rg` and `Get-Content`.
- Impeccable context and established-surface guidance loaded.
- `npm run types:check`, focused ESLint/Prettier, PHPStan, Pint, focused PHPUnit suites, `npm run build`.
- Isolated SQLite `migrate`, `migrate:rollback --step=1`, and `migrate`.
- Focused logo upload/serve/replace/remove and super-admin permission tests.
- Impeccable detector; its one gray-on-color warning was corrected.

## Verification Results

- VERIFIED: 20 platform settings and super-admin tests passed with 168 assertions.
- VERIFIED: platform settings tests passed with 55 assertions after the schema fallback and dynamic social update.
- VERIFIED: updated platform settings and super-admin suites passed 22 tests with 197 assertions.
- VERIFIED: logo upload, replacement cleanup, public serving, removal, validation, authorization, and auditing passed.
- VERIFIED: PHPStan passed with 0 errors at a 512 MB analysis limit.
- VERIFIED: TypeScript check, focused ESLint, Prettier, and Pint passed.
- PARTIAL: the initial production Vite build passed; the final rebuild is blocked by the concurrently changed translation Babel plugin across 35 files.
- VERIFIED: migration up, rollback, and re-apply passed on an isolated SQLite database.
- NOT VERIFIED: screenshots at 320, 375, 640, 768, 1024, 1280, and 1536 because localhost browser navigation was blocked by browser policy.

## Remaining Risks and Limitations

- The uploaded platform logo is supported; the separate SEO social-preview image remains URL-based.
- SEO is a platform default, not a per-page content system.
- Responsive composition was reviewed structurally, but visual browser evidence remains outstanding.

## Completion Summary

Implemented a global Brand & SEO center with guarded platform permissions, audited atomic persistence, secure logo management, a broad extensible social-link catalog, public brand sharing, home metadata, social preview metadata, and indexing controls. Focused automated and migration verification passed; responsive screenshots remain blocked by the unavailable browser-control runtime.
