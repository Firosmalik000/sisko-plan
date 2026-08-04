# Phase 8 — Hardening, Pilot, and Production Readiness

## Goal

Prepare a secure, observable, documented Stage 1 release for controlled pilot users.

## Dependencies

- Phases 1–7 complete.

## Scope

### Quality

- Full regression suite.
- Cross-store security matrix.
- Transaction rollback tests.
- Performance review.
- N+1 review.
- Index review.
- Browser smoke tests.
- Accessibility and responsive review.
- Error-state review.

### Security

- Platform Admin 2FA.
- Rate limits.
- Upload review.
- Authorization review.
- Secret/log review.
- Production error handling.
- Dependency audit.
- Backup and restore test.

### Operations

- Production deployment documentation.
- Queue and scheduler verification.
- Monitoring and logging.
- Failed-job handling.
- Backup schedule.
- Restore runbook.
- Incident basics.
- Data export and account closure policy.
- Seed/demo data separated from production.

### Pilot

- Onboarding guide.
- User acceptance scenarios.
- Pilot feedback capture.
- Known-limitations document.
- Release checklist.
- Version 1.0 release notes.

## Out of scope

- New major business modules.
- Stage 2 roles or multi-warehouse unless fixing a release blocker.

## Required tests

- Entire automated suite.
- Clean install/migration.
- Upgrade migration from pilot baseline if applicable.
- Backup restore.
- Primary browser journeys.
- Authorization/security review.
- Load smoke tests for realistic pilot volume.

## Acceptance criteria

- No known critical tenancy or financial-integrity defect.
- Backup restore is proven.
- Deployment and rollback are documented.
- Pilot flows succeed.
- Known limitations are explicit.
- Stage 1 version is release-ready.
