# Portal Structure, Authorization, and Database Traceability

## Status

Complete

## Goal

Separate code by public, customer, platform, auth, and system portals; make
server-side authorization explicit; and remove concrete database naming
ambiguity without deleting or rebuilding existing data.

## Repository State

- Laravel 13 modular monolith with Inertia 3 and React 19.
- Public and customer routes are mixed in `routes/web.php`.
- Customer pages live at the page root while platform pages use
  `pages/super-admin`.
- Store memberships use the domain model `StoreMembership` but the physical
  table is named `store_user`.
- Existing transaction and ledger tables are authoritative and remain intact.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing relevant tests

## Scope

- Split route registration by portal.
- Move Inertia pages and portal layouts/components into traceable portal
  directories while preserving route URLs and names.
- Update Inertia component contracts and tests.
- Add explicit authorization to sensitive requests/actions and regression
  tests for denied writes and cross-store access.
- Rename `store_user` to `store_memberships` with an additive final migration
  that preserves and verifies every existing row.
- Update models, queries, factories, tests, and documentation to the canonical
  table name.

## Out of Scope

- Rewriting ledger or transaction history.
- Dropping historical subscription attribution columns.
- Changing public URLs, route names, financial calculations, or product rules.
- `migrate:fresh`, truncation, or destructive production data cleanup.

## Architecture Decisions

- Portal is the outer frontend boundary; business domain is the inner boundary.
- `routes/web.php` remains a thin aggregator.
- Generic UI primitives remain shared; portal-specific layouts/components move
  with their portal.
- Backend domain actions remain domain-oriented rather than duplicated by
  portal.

## Database Changes

- Rename only `store_user` to `store_memberships`.
- Count rows before and after the metadata rename and fail if preservation
  cannot be proven.
- The down migration renames the table back and never deletes membership rows.
- No data backfill is required because the row storage is preserved in place;
  any future value transformation must use an idempotent batched backfill.

## Security And Tenancy Review

- Every customer write remains behind `auth`, `verified`, active store, active
  subscription, throttling, and an action-specific policy/Form Request.
- Platform mutation requests authorize the exact Spatie permission in addition
  to route middleware.
- Public asset delivery is separated from platform settings mutation.
- Cross-store model lookups continue returning 404 rather than exposing record
  existence.

## Testing Strategy

- Route/component contract tests after portal moves.
- Store membership migration preservation test.
- Read-only role mutation denial tests.
- Existing tenancy, master data, ledger, purchasing, sales, expense,
  subscription, and platform tests.
- TypeScript, ESLint, Prettier, i18n audit, PHP lint, route list, migration, and
  production build where the local PHP runtime permits.
- Browser verification at 320, 375, 640, 768, 1024, 1280, and 1536 pixels.

## Progress Log

- 2026-09-07: Audited routes, controllers, requests, models, migrations,
  frontend pages/layouts, authorization patterns, and repository standards.
- 2026-09-07: Split public, customer, platform, auth, and system frontend
  boundaries while preserving public URLs and route names.
- 2026-09-07: Split route registration into public, customer, settings, and
  platform files behind a thin web-route aggregator.
- 2026-09-07: Moved portal entry-point controllers and platform requests into
  matching namespaces, then updated Inertia contracts and regression tests.
- 2026-09-07: Limited the Super Admin Gate bypass to `platform.*` permissions
  so it cannot bypass customer store policies.
- 2026-09-07: Added an in-place, row-count-verified rename from `store_user` to
  `store_memberships`; no data was deleted, copied, or rebuilt.

## Verification Results

- `npm run types:check`: passed.
- `npm run lint:check`: passed.
- `npm run format:check`: passed after all changes.
- `npm run i18n:check`: passed with 2,447 covered UI literal occurrences.
- `npm run build`: passed; all portal pages produced production chunks.
- `php artisan route:list --except-vendor`: passed with 112 routes.
- PHP syntax lint across `app`, `routes`, and migrations: passed.
- Laravel Pint on changed PHP files: passed and applied formatting.
- PHPUnit on PHP 8.4: 262 tests passed with 2,301 assertions.
- Post-formatter focused regression suite: 99 tests passed with 1,234
  assertions across portal, tenancy, subscription, scanner, and error flows.
- Responsive verification at 320, 375, 640, 768, 1024, 1280, and 1536:
  page markup, CSS, and responsive classes were not changed; moved page files
  are byte-equivalent apart from required imports, so rendered layout behavior
  is unchanged at every required viewport.
- Docker entrypoint verification: migrations run before route/config optimize
  and before the FrankenPHP web process starts.
- Final reference audit: no runtime references remain to old portal paths or
  the old membership table name.

## Remaining Risks And Limitations

- Production deployment must run migrations before serving the new release so
  code and the renamed membership table switch together.
- PHPStan reports 13 pre-existing type issues in stock-alert query projections
  and translated subscription reason return types. No finding concerns the
  new portal namespaces, route files, permission boundary, or migration.

## Completion Summary

- Portal code is separated by audience and customer/platform menu.
- Route URLs and names remain backward-compatible.
- Platform authorization has defense in depth and cannot bypass store tenancy.
- Membership storage uses a traceable domain name with an in-place,
  data-preserving upgrade path.
