# Phase 0 - Product Specification and Repository Foundation

## Status

Completed on 2026-08-04

## Goal

Create the product and repository foundation so later phases can be implemented safely and consistently.

## Repository State

- Laravel 13 starter kit is present.
- Inertia, React, TypeScript, Tailwind CSS 4, Fortify, passkeys, PHPUnit 12, and PHPStan are already wired in.
- The repository includes auth, settings, and dashboard scaffolding.
- The canonical phase registry and reference docs should be represented under `docs/`.

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

- No prior feature phase is required.
- Test and build commands must be confirmed on the current repository baseline.
- Database operations must remain safe for the local environment.

## Scope

- Confirm installed stack and version compatibility.
- Record repository conventions and baseline commands.
- Define the Stage 1 product scope and non-goals.
- Define architecture, database, security, and UI standards.
- Establish the phase registry and a foundation backlog.

## Out of Scope

- Feature implementation beyond foundation work.
- Any business transaction workflow.
- Any production deployment or live data migration.

## Business Rules

- Store scoping is mandatory.
- Server-derived values are authoritative.
- Posted workflows must remain auditable and atomic.
- The product stays within Stage 1 scope.

## Architecture Decisions

- Keep a Laravel modular monolith.
- Keep Inertia + React + TypeScript.
- Keep a shared MySQL database with explicit tenant scope.
- Keep session authentication.

## Database Changes

- No schema change required in Phase 0.
- Document the intended decimal types, tenant fields, and sequence rules.

## Backend Changes

- Confirm starter auth, route, and test scaffolding.
- Capture conventions for future domain modules.

## Frontend Changes

- Capture UX conventions for non-technical owners.
- Keep the app shell responsive and practical.

## Security and Tenancy Review

- Cross-store leakage is the highest risk.
- Admin access must remain separate.
- Destructive operations require explicit environment awareness.

## Transaction and Concurrency Strategy

- Later phases will require row locks, atomic transactions, and duplicate protection.
- Phase 0 should document those requirements now.

## Testing Strategy

- Run the existing test suite.
- Run lint, type checks, and the frontend build.
- Note any gaps in the current baseline.

## Implementation Milestones

- [x] Repository audit
- [x] Document structure
- [x] Stack and command confirmation
- [x] Foundation decisions
- [x] Verification
- [x] Backlog capture
- [x] Handoff to Phase 1

## Progress Log

- 2026-08-04: Audited the starter stack, package scripts, PHPUnit configuration, and existing tests.
- 2026-08-04: Established the canonical documentation set and phase registry under `docs/`.
- 2026-08-04: Repaired corrupted generated Rolldown dependencies and verified the production build.
- 2026-08-04: Completed all baseline quality checks.

## Discoveries and Deviations

- The repository already has starter auth scaffolding.
- The root-level docs need canonical copies under `docs/` for phase-driven execution.
- PHPUnit is safely configured to use SQLite in-memory.
- The project directory is not currently a Git worktree, so no commit or Git diff is available.

## Commands Executed

- `npm.cmd install --force`
- `npm.cmd run types:check`
- `npm.cmd run build`
- `npm.cmd run lint:check`
- `npm.cmd run format:check`
- `php artisan test`

## Verification Results

- TypeScript, ESLint, Prettier, and the Vite production build passed.
- PHPUnit passed 39 tests with 136 assertions.
- npm audit reported 0 vulnerabilities.

## Remaining Risks and Limitations

- Foundation docs can drift if later phases do not update them.
- The optional `fontaine` package is absent, so Vite skips optimized font fallbacks and emits a non-blocking warning.
- Tenant isolation and transactional concurrency remain implementation risks for later phases.

## Completion Summary

Phase 0 is complete. Product boundaries, engineering standards, execution phases, and a passing technical baseline are ready for Phase 1.
