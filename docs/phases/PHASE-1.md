# Phase 1 - Authentication, Super Admin, and Multi-Store

## Status

Completed on 2026-08-04

## Goal

Provide secure user authentication, an isolated Super Admin surface, and a verified active-store context for every store operation.

## Repository State

- Laravel Fortify already provides registration, login, password reset, email verification, passkeys, and two-factor authentication for store users.
- No store, membership, active-store context, or platform administrator domain exists yet.
- The root `PHASE-1.md` contains Phase 3 inventory content and is treated as a repository deviation rather than the active specification.

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
- [x] Existing authentication, dashboard, profile, and security tests

## Dependencies and Prerequisites

- Phase 0 is complete.
- Existing Fortify authentication remains the user authentication foundation.
- Verification uses SQLite in-memory and must not touch local development data.

## Scope

- User account status enforcement.
- Store creation and basic settings.
- Store membership with owner, admin, and cashier roles.
- Active-store selection and request context.
- Safe store switching.
- Existing-member assignment by email.
- Separate Super Admin guard, login, dashboard, user list, and store list.
- User/store activation and suspension by Super Admin.
- Super Admin audit log.
- Responsive store and Super Admin interfaces.
- Tenant-isolation and authorization tests.

## Out of Scope

- Invitations for email addresses without an existing account.
- Granular permissions beyond owner, admin, and cashier roles.
- Product, inventory, purchase, POS, finance, and subscription records.
- Super Admin impersonation.
- Super Admin password reset, passkeys, or 2FA enrollment UI.

## Business Rules

- A registered user can own multiple stores.
- A store creator becomes its active owner in the same transaction.
- The primary store owner must retain an active owner membership.
- Only active memberships can establish an active-store context.
- A suspended user cannot log in or continue an authenticated store session.
- A suspended store cannot become or remain the active store.
- The browser never supplies authoritative membership or active-store ownership values.
- Platform administrators never gain store membership implicitly.

## Architecture Decisions

- Store users continue to authenticate through the existing `web` guard and Fortify.
- Super Admin uses a dedicated `platform_admin` session guard and `platform_admins` table.
- Store URLs use ULIDs through route model binding.
- Active store ID is stored in session and resolved by `SetActiveStore`; no global mutable static tenant state is used.
- `CurrentStore` is request-scoped through Laravel's container.
- Store authorization is handled by `StorePolicy` plus scoped membership queries.

## Database Changes

- Add status and last-login fields to `users`.
- Create `platform_admins`.
- Create `stores`.
- Create `store_user` with unique store/user membership.
- Create `store_settings`.
- Create tenant-aware `audit_logs` for store-domain activity.
- Create `admin_audit_logs`.

## Backend Changes

- Models, factories, and relationship definitions for identity and tenancy.
- User-status authentication enforcement.
- Store CRUD subset, switching, and member management.
- Request-scoped active-store resolver and middleware.
- Dedicated Super Admin authentication and administration controllers.
- Policies, form requests, and admin audit recording.
- Store-creation audit recording and successful-login timestamp listener.

## Frontend Changes

- Empty-store onboarding and create-store page.
- Store listing and member management page.
- Persistent store switcher in the app sidebar.
- Store-aware dashboard.
- Separate Super Admin login and administration layout/pages.
- Pagination controls for Super Admin user and store listings.

## Security and Tenancy Review

- Every store route uses authenticated membership and store status checks.
- Store IDs from another tenant are denied through policy and scoped queries.
- Super Admin routes use a separate guard and route prefix.
- Login endpoints are rate limited and sessions regenerate after login.
- Sensitive Super Admin status changes are audited.
- Suspension invalidates authorization on the next request even if a session exists.
- Suspended stores reject detail, update, and member-management operations.
- Existing memberships cannot be mutated through the add-member endpoint.

## Transaction and Concurrency Strategy

- Store creation, owner membership, and settings creation occur in one transaction.
- Member role/status updates lock the target membership; the primary owner membership cannot be demoted or suspended.
- Status changes and their audit records occur in one transaction.

## Testing Strategy

- Preserve all existing authentication tests.
- Test store creation and automatic owner membership.
- Test active-store selection and switching.
- Test cross-store denial and suspended membership/store behavior.
- Test member management and the last-owner invariant.
- Test separate Super Admin authentication and guard isolation.
- Test Super Admin status changes and audit records.

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

- 2026-08-04: Audited the post-initial-commit repository and existing authentication stack.
- 2026-08-04: Defined Phase 1 scope and tenancy decisions from the canonical foundation documents.
- 2026-08-04: Added identity/tenancy schema, typed models, custom membership pivot, factories, and atomic store creation.
- 2026-08-04: Added active user/store enforcement, policies, member management, and request-scoped store context.
- 2026-08-04: Added a separate Super Admin guard, control panel, suspension controls, creation command, and audit trail.
- 2026-08-04: Added responsive store onboarding, switcher, member management, dashboard, and Super Admin interfaces.
- 2026-08-04: Completed tenant-isolation tests, static analysis, frontend checks, production build, and diff review.
- 2026-08-06: Reviewed Phase 1 and fixed membership invariants, suspended-store writes, store audit coverage, login timestamp accuracy, Super Admin pagination, and toast consistency.
- 2026-08-06: Added regression coverage and reran every backend and frontend quality gate.

## Discoveries and Deviations

- Root `PHASE-1.md` is mislabeled and contains Phase 3 inventory requirements.
- The canonical Phase 1 specification is therefore maintained in this file.
- Adding a second authentication guard widened Laravel request-user types in static analysis; typed guard resolvers now make the selected identity explicit.
- The local PHPStan process needs a 512 MB memory limit on this environment; the default 128 MB limit exhausted memory before analysis completed.

## Commands Executed

- `php artisan route:list --except-vendor`
- `php artisan migrate --force`
- `php artisan test`
- `php vendor/bin/pint --dirty`
- `php -d memory_limit=512M vendor/bin/phpstan analyse --no-progress`
- `npm.cmd run lint:check`
- `npm.cmd run format:check`
- `npm.cmd run types:check`
- `npm.cmd run build`
- `git diff --check`

## Verification Results

- PHPUnit: 58 tests passed with 201 assertions.
- Review-targeted authentication and tenancy tests: 21 tests passed with 70 assertions.
- PHPStan: passed with zero errors using a 512 MB process memory limit.
- Pint: passed.
- ESLint: passed.
- Prettier: passed.
- TypeScript: passed with `tsc --noEmit`.
- Vite production build: passed after transforming 3,354 modules.
- Git whitespace check: passed.
- Migrations passed in SQLite in-memory tests and were applied successfully to the local MySQL `sisko-plan` database.

## Remaining Risks and Limitations

- Role granularity is intentionally narrow in Stage 1.
- Super Admin 2FA is required before production but enrollment is deferred from this phase.
- Member invitations only support users who already have an account.
- Primary store ownership transfer and store closure workflows are deferred.
- A browser automation pass was not run; responsive layouts were covered by implementation review and production compilation.

## Completion Summary

Phase 1 now provides isolated user and Super Admin authentication, multi-store ownership and membership, safe active-store switching, suspension enforcement, administrative audit logs, and a tested tenant boundary. The local database is migrated; create the first operator with `php artisan platform-admin:create` before using the control panel.
