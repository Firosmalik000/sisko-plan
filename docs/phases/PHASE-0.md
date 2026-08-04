# Phase 0 - Product Specification and Repository Foundation

## Status

Completed on 2026-08-04

## Goal

Prepare the repository so implementation can proceed consistently and safely.

## Repository State

The repository is already a Laravel 13 starter stack with:

- Inertia.
- React.
- TypeScript.
- Tailwind CSS 4.
- PHPUnit 12.
- Fortify and passkeys support.
- Existing auth, settings, and dashboard scaffolding.

The current root also contains phase and reference documents, but the canonical phase registry for this kit is expected under `docs/`.

## Required Documents Read

- [x] `AGENTS.md`
- [x] `docs/PHASES.md`
- [x] `docs/00_PRODUCT_SCOPE.md`
- [x] `docs/01_BUSINESS_RULES.md`
- [x] `docs/02_ARCHITECTURE.md`
- [x] `docs/03_DATABASE_STANDARDS.md`
- [x] `docs/04_SECURITY_TENANCY.md`
- [x] `docs/05_TESTING_QUALITY.md`
- [x] `docs/06_UI_UX_STANDARDS.md`
- [x] Existing relevant tests

## Dependencies and Prerequisites

- No earlier product phases are required.
- The repository already includes a working baseline stack.
- Environment safety must be confirmed before any destructive database action.

## Scope

- Repository audit.
- Version compatibility review.
- Authentication starter-kit confirmation.
- Folder and naming conventions.
- Formatting, linting, type check, test, and build commands.
- Environment and database safety.
- Initial product scope, architecture, and database plan.
- Phase backlog and planning structure.

## Out of Scope

- Full business modules.
- POS implementation.
- Purchasing implementation.
- Subscription implementation.
- Any production data migration or destructive reset.

## Business Rules

- Stage 1 remains a modular monolith.
- Store data must remain isolated.
- Server-side values are authoritative.
- Posted workflows must be atomic and auditable.
- Product scope must stay aligned to the Stage 1 mission.

## Architecture Decisions

- Laravel remains the backend framework.
- Inertia + React remain the UI approach.
- TypeScript remains the frontend language.
- MySQL remains the database target.
- Session authentication remains the default.
- Domain logic should live server-side in clear modules.

## Database Changes

- No production schema change is required in Phase 0.
- The phase should define the initial ERD and database conventions.
- Document sequence, tenant scoping, and decimal standards must be explicit before later migrations.

## Backend Changes

- Confirm starter-kit routes and auth scaffolding.
- Confirm baseline test setup and factories.
- Document expected backend conventions for later phases.

## Frontend Changes

- Confirm the existing React and Inertia scaffold.
- Document UI conventions for store-facing screens and later POS work.

## Security and Tenancy Review

- Cross-store isolation must be treated as a primary risk.
- The platform admin surface must remain separate from store operations where applicable.
- Destructive database actions must be avoided outside a known test environment.

## Transaction and Concurrency Strategy

- Later phases will require atomic workflows and row-locked document sequences.
- Phase 0 should capture those constraints early, even if no workflow is implemented yet.

## Testing Strategy

- Verify the current test suite.
- Verify type checking and linting.
- Verify the frontend build.
- Confirm the test database configuration is safe and isolated.

## Implementation Milestones

- [x] Repository audit
- [x] Document alignment
- [x] Stack and command confirmation
- [x] Foundation decisions
- [x] Phase backlog
- [x] Verification
- [x] Completion report

## Progress Log

- 2026-08-04: Audited the Laravel starter stack and existing tests.
- 2026-08-04: Created the canonical product, architecture, database, security, testing, UI/UX, decision, glossary, and phase documents under `docs/`.
- 2026-08-04: Reinstalled corrupted Rolldown native and WASM dependency artifacts.
- 2026-08-04: Completed backend and frontend baseline verification.

## Discoveries and Deviations

- The repo already contains a starter stack with auth scaffolding.
- The repository root currently holds several reference docs, while the phase registry is expected under `docs/`.
- The installed Rolldown native and WASM binaries were corrupted. Reinstalling only those generated dependency folders restored the production build.
- The project directory is not currently a Git worktree, so no commit or Git diff was produced.

## Commands Executed

- `npm.cmd install --force`
- `npm.cmd run types:check`
- `npm.cmd run build`
- `npm.cmd run lint:check`
- `npm.cmd run format:check`
- `php artisan test --testsuite=Unit --stop-on-failure`
- `php artisan test --testsuite=Feature --stop-on-failure`
- `php artisan test`

## Verification Results

- TypeScript: passed with `tsc --noEmit`.
- Production build: passed; Vite transformed 3,345 modules and generated `public/build/manifest.json`.
- ESLint: passed.
- Prettier: passed for all files under `resources/`.
- PHPUnit: 39 tests passed with 136 assertions using SQLite in-memory.
- Dependency audit: npm reported 0 vulnerabilities.

## Remaining Risks and Limitations

- The Vite font plugin reports that optimized font fallbacks require the optional `fontaine` package; this does not fail the build.
- Generated dependency binaries can become corrupted in the local npm installation and may require a targeted reinstall.
- Later phases still require full domain implementation, tenant-isolation tests, and transaction/concurrency tests.

## Completion Summary

The repository now has a canonical product specification, engineering standards, phase registry, and verified Laravel/Inertia baseline. Phase 1 can begin without introducing business modules into the foundation phase.
