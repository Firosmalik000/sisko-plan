# Phase 8 - Security Hardening, Pilot, and Production Readiness

## Status

Completed

## Goal

Turn the completed Stage 1 feature set into a pilot-ready release with enforceable Platform Admin security, safe production defaults, diagnosable requests, dependency readiness checks, repeatable CI, and practical operating procedures.

## Repository State

- Phase 1 through Phase 7 are complete in the working tree and remain uncommitted.
- The local database is migrated through Phase 7 batch 11.
- Root `PHASE-8.md` contains a shifted Phase 6 brief, so the canonical Phase 8 brief is reconstructed in `docs/phases/PHASE-8.md`.

## Required Documents Read

- [x] `AGENTS.md`
- [x] Active phase registry and shifted root phase file
- [x] Business rules
- [x] Architecture
- [x] Database standards
- [x] Security and tenancy
- [x] Testing and quality
- [x] UI/UX standards
- [x] Existing authentication, Platform Admin, tenancy, subscription, and transaction tests

## Dependencies and Prerequisites

- Separate Platform Admin guard and audit log.
- Fortify TOTP provider and recovery code support.
- Active-store, subscription, policy, transaction, and idempotency protections from prior phases.

## Scope

- Platform Admin TOTP setup, confirmation, login challenge, recovery, regeneration, disabling policy, and audit.
- Production enforcement for confirmed Platform Admin 2FA.
- Security response headers, request correlation IDs, and named write rate limiters.
- Liveness/readiness separation and production preflight command.
- CI workflow and operational runbooks for deploy, backup/restore, rollback, incident response, and pilot acceptance.

## Out of Scope

- Vendor-specific infrastructure, managed monitoring, penetration testing certification, high availability, replicas, automatic failover, and organizational on-call staffing.

## Business Rules

- Platform Admin 2FA secrets and recovery codes remain encrypted and hidden.
- Recovery codes are single use.
- A password-authenticated admin with pending 2FA is not authenticated until the challenge succeeds.
- Required 2FA blocks access to every Platform Admin function except security setup and logout.
- Readiness and diagnostics never expose credentials, SQL, exception messages, or internal topology.
- Production preflight fails closed on unsafe critical settings.

## Architecture Decisions

- Reuse Fortify actions/provider for TOTP cryptography but keep routes and sessions isolated to the `platform_admin` guard.
- Add focused middleware for security headers, request IDs, and required Platform Admin 2FA.
- Centralize rate-limit definitions in `AppServiceProvider` and apply them at route boundaries.
- Implement readiness as a small controller and preflight as a reusable service plus Artisan command.
- Keep infrastructure procedures in versioned Markdown and CI in GitHub Actions.

## Database Changes

- Add encrypted TOTP secret, encrypted recovery codes, and confirmation timestamp to `platform_admins`.

## Backend Changes

- Platform Admin security/challenge controllers and middleware.
- Security headers, request ID middleware, named rate limiters, readiness probe, readiness/preflight service, and command.
- Audit 2FA lifecycle and successful recovery login.

## Frontend Changes

- Platform Admin TOTP challenge page.
- Platform Admin security page for enrollment, confirmation, recovery codes, regeneration, and allowed disabling.
- Security navigation/status in the Platform Admin shell.

## Security and Tenancy Review

- No store data is queried by readiness or platform security flows.
- Challenge session identifiers are regenerated/removed on success and invalidated on logout.
- Sensitive fields stay hidden and encrypted with `APP_KEY`.
- Recovery codes are replaced atomically after use.
- Rate-limit keys combine actor/store where available and IP as fallback.

## Transaction and Concurrency Strategy

- TOTP state updates use model writes with password re-authentication for sensitive lifecycle changes.
- Recovery-code replacement uses Fortify's persisted replacement flow.
- Readiness performs read-only dependency checks.
- No destructive database operation is introduced.

## Testing Strategy

- Feature tests cover Platform Admin setup/challenge/recovery, enforcement, rate limiting, headers/request ID, readiness, and preflight.
- Existing full regression protects identity, tenancy, ledgers, purchasing, POS, reporting, and subscriptions.
- Run Pint, PHPStan, TypeScript, ESLint, Prettier, migration, and production build checks.

## Implementation Milestones

- [x] Repository audit
- [x] Schema and migrations
- [x] Backend domain
- [x] Authorization and validation
- [x] Frontend
- [x] Automated tests
- [x] Verification
- [x] Diff review
- [x] Documentation
- [x] Completion report

## Progress Log

- 2026-08-08: Audited Phase 1-7 security controls, Platform Admin guard, Fortify support, route throttling, health endpoint, environment template, and quality scripts.
- 2026-08-08: Reconstructed canonical Phase 8 because root `PHASE-8.md` contains a shifted Phase 6 specification.
- 2026-08-08: Added separate Platform Admin TOTP enrollment, challenge, one-time recovery, production enforcement, and audited lifecycle controls.
- 2026-08-08: Added security headers, request IDs, trusted-host/proxy controls, write throttling, readiness, preflight, and reset-token scheduling.
- 2026-08-08: Added GitHub Actions CI plus production, backup/restore, rollback, pilot, and incident runbooks.
- 2026-08-08: Applied local migration batch 12 and completed focused, full regression, config-cache, route, scheduler, static, frontend, and build verification.

## Discoveries and Deviations

- Store users already have Fortify 2FA/passkeys; the material authentication gap is the separate Platform Admin guard.
- Existing `/up` is a framework liveness probe and intentionally does not prove database/cache readiness.
- Laravel disables trusted-host enforcement while running unit tests, so hostile Host verification remains an explicit production smoke check instead of a misleading feature test.
- The first combined CI-equivalent run exposed PHPStan's 128 MB default; the Composer script now sets a deterministic 1 GB analysis limit.
- Local preflight correctly fails because the environment is local/debug, production HTTPS/session/header controls are off, and no active Platform Admin exists.

## Commands Executed

- `php artisan test tests/Feature/ProductionReadinessTest.php`
- `php artisan test`
- `composer ci:check`
- `vendor/bin/pint --dirty`
- `vendor/bin/phpstan analyse --memory-limit=1G`
- `npm run lint:check`
- `npm run format:check`
- `npm run types:check`
- `npm run build`
- `php artisan about --only=environment`
- `php artisan migrate --force`
- `php artisan migrate:status`
- `php artisan config:cache`, followed by `php artisan config:clear`
- `php artisan route:list --path=super-admin/security`
- `php artisan route:list --path=ready`
- `php artisan schedule:list`
- `php artisan app:production-check`
- `git diff --check`

## Verification Results

- Phase 8 focused suite: 9 tests, 57 assertions, all passing.
- CI-equivalent combined gate: 144 tests, 848 assertions, all passing.
- Pint and PHPStan: passing with no errors.
- TypeScript, ESLint, and Prettier: passing.
- Production Vite build: passing.
- Configuration cache, routes, and scheduler: passing.
- Local migration: batch 12, status `Ran`.
- Local preflight: expected non-zero result with explicit local/non-production blockers and current migrations passing.

## Remaining Risks and Limitations

- Host-header enforcement is disabled by Laravel during unit tests and must be included in production smoke verification.
- The repository provides no managed backup, monitoring, WAF, SIEM, high availability, automatic failover, or penetration-test certification.
- Readiness covers database and cache only; infrastructure monitoring must separately cover queue workers, mail, storage, backups, and capacity.
- Production cannot be declared ready until infrastructure is provisioned, at least one active Platform Admin completes TOTP enrollment, preflight passes on the release host, and the restore drill is accepted.

## Completion Summary

Phase 8 is complete at repository level. Stage 1 now has enforceable Platform Admin 2FA, safe web defaults, request correlation, write throttling, dependency readiness, fail-closed production preflight, deterministic CI, and versioned operating procedures. Actual pilot go-live remains a controlled operational decision gated by the production preflight and pilot checklist.
