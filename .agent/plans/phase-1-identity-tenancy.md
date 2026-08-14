# Phase 1 - Authentication, Super Admin, and Multi-Store

## Status

Completed on 2026-08-04

## Objective

Implement the identity and tenant boundary required by every later business phase.

## Execution Order

1. Add identity and tenancy schema, models, factories, and seed support.
2. Add active-store resolution, status enforcement, policies, and store workflows.
3. Add the separate Super Admin guard, administration workflows, and audit trail.
4. Add store-facing and Super Admin UI.
5. Prove authentication, role enforcement, and cross-store isolation with tests.
6. Run migrations and all quality gates, review the diff, and complete the phase record.

## Key Decisions

- Store users and Super Admins use separate authenticatable models and session guards.
- Stores use ULIDs in URLs and integer foreign keys internally.
- Session active-store state is treated as a hint and reauthorized on each request.
- A request-scoped `CurrentStore` object exposes tenant context to later phases.
- Store creators receive an owner membership atomically.
- The primary owner membership cannot be demoted or suspended.

## Completion Gate

- Migrations run from a clean test database.
- User and Super Admin authentication are isolated.
- Cross-store access is denied by tests.
- Store creation, switching, member management, and suspension work end-to-end.
- PHPUnit, PHPStan, Pint, ESLint, Prettier, TypeScript, and Vite build pass.

## Result

- All completion gates passed.
- A post-implementation review fixed owner-membership mutation, suspended-store writes, missing store-creation audit, premature login timestamps, missing admin pagination controls, and inconsistent success toasts.
- PHPUnit passed 58 tests with 201 assertions.
- PHPStan, Pint, ESLint, Prettier, TypeScript, and the production build passed.
- Isolated test migrations passed and the local MySQL database was migrated successfully.
