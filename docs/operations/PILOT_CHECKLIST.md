# Pilot Go-Live Checklist

## Go Or No-Go

All critical items must be checked before admitting pilot users.

### Release

- [ ] Exact commit approved and CI green.
- [ ] Production build artifact is immutable.
- [ ] `php artisan app:production-check` passes.
- [ ] Migration status has no pending migration.
- [ ] `/up` and `/ready` are monitored from outside the host.
- [ ] Rollback owner and previous release are identified.

### Security

- [ ] Production secrets are outside Git and default credentials are rotated.
- [ ] HTTPS, secure/encrypted session cookies, CSP, and HSTS are verified in a browser response.
- [ ] Every active Platform Admin has confirmed TOTP and vaulted recovery codes.
- [ ] Owner, admin, and cashier permissions were tested with separate accounts.
- [ ] Cross-store URL and submitted-ID tampering tests pass.
- [ ] Rate-limit behavior and generic production error pages are verified.

### Data And Recovery

- [ ] Automated encrypted backup completed successfully.
- [ ] Restore drill completed against an isolated database.
- [ ] Backup retention, owner, alert, and deletion policy are recorded.
- [ ] MySQL timezone, application timezone, and store timezone are confirmed.

### Pilot Workflows

- [ ] Register/login, email verification, 2FA, password reset, and logout.
- [ ] Create and switch stores; add owner/admin/cashier membership.
- [ ] Configure product/unit/category/supplier/account master data.
- [ ] Opening cash, capital, stock adjustment, and account transfer.
- [ ] Cash, partial, and credit purchase with supplier payment.
- [ ] POS cash sale, stock/COGS/cash effect, receipt, and return.
- [ ] Expense entry and dashboard/report reconciliation.
- [ ] Subscription expiry keeps reads available and blocks writes.
- [ ] CSV export opens correctly with pilot data.
- [ ] Mobile owner flow and desktop cashier POS flow are usable.

### Support

- [ ] Pilot stores, named contacts, support hours, and escalation path are recorded.
- [ ] Known limitations are shared: no offline POS, formal accounting, tax filing, or automated subscription gateway.
- [ ] Incident commander and technical responder are assigned.
- [ ] Request ID collection instructions are included in support scripts.
- [ ] Daily pilot reconciliation and feedback review time is scheduled.

## Exit Criteria

- No unresolved severity-1 or severity-2 issue.
- No unexplained stock, cash, payable, COGS, or subscription discrepancy.
- Backup and restore evidence is accepted.
- Pilot owner signs off on core workflows and known limitations.
