# Phase 8 - Security Hardening, Pilot, and Production Readiness

## Status

Completed

## Required Outcomes

- Platform Admin authentication requires a confirmed second factor in production.
- Web responses carry a conservative baseline of security headers and a correlation identifier.
- Authentication and sensitive tenant/platform writes are rate limited without penalizing normal reads.
- Operations can distinguish liveness from dependency readiness without exposing infrastructure details.
- A production preflight detects unsafe environment, session, logging, queue, mail, database, migration, and Platform Admin 2FA settings.
- CI runs backend and frontend quality gates on every proposed change.
- Deployment, migration, backup, restore, rollback, pilot, and incident procedures are documented and testable.
- Existing tenancy, ledger correctness, subscription enforcement, and user workflows remain regression-safe.

## Scope Decisions

- Use Fortify's TOTP provider and recovery-code primitives for the separate Platform Admin guard.
- Require Platform Admin 2FA through configuration, with production defaulting to required.
- Keep `/up` as liveness and add `/ready` as a dependency readiness probe with a generic response body.
- Treat request IDs as diagnostic metadata only; never trust them for authorization or idempotency.
- Apply named rate limiters to state-changing tenant and platform routes while safe HTTP methods remain unrestricted.
- Provide infrastructure-neutral operational runbooks rather than coupling Stage 1 to a hosting or monitoring vendor.

## Out of Scope

- Managed WAF, SIEM, APM, secrets manager, database replicas, automated failover, gateway-specific infrastructure, penetration-test certification, and 24/7 incident staffing.

## Acceptance Criteria

- Platform Admin TOTP and one-time recovery-code login are covered by automated tests.
- Production-required 2FA cannot be bypassed by navigating directly to another admin route.
- Security headers and request IDs are present on successful and error responses.
- Readiness returns `200` when dependencies work and `503` without exception details when they fail.
- Preflight exits non-zero for unsafe production configuration and passes a known-safe configuration.
- Full backend/frontend checks and production build pass.
