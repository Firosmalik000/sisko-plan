# Incident Response

## Priorities

1. Protect people and credentials.
2. Stop cross-store exposure, unauthorized writes, or ledger corruption.
3. Preserve evidence, audit history, logs, request IDs, and affected data.
4. Restore safe read/write service.
5. Reconcile business effects and communicate clearly.

## Severity

- `SEV-1`: confirmed cross-store leak, admin compromise, destructive data corruption, or widespread outage.
- `SEV-2`: material transaction inconsistency, prolonged degraded writes, failed restore, or repeated unauthorized attempts.
- `SEV-3`: limited workflow failure with a safe workaround and no integrity/security impact.

## First Response

1. Assign an incident commander and open a timestamped incident log.
2. Capture release commit, environment, `/up` and `/ready` state, request IDs, error rate, queue state, and database health.
3. For suspected data exposure or corruption, disable affected accounts/stores or enter maintenance mode before investigating through production writes.
4. Preserve logs and a transaction-consistent database snapshot. Do not delete suspicious records.
5. Rotate compromised passwords, API credentials, and sessions. Rotate `APP_KEY` only with a reviewed plan because it protects sessions and encrypted 2FA data; use `APP_PREVIOUS_KEYS` during controlled rotation where appropriate.
6. Use immutable audit and ledger records to identify scope. Never "repair" posted history by editing rows directly.

## Recovery And Communication

1. Choose application rollback, feature containment, or verified backup restore based on data compatibility.
2. Validate tenancy boundaries and reconcile stock, cash, payable, sales, COGS, expenses, and subscription status before reopening writes.
3. Communicate confirmed facts, affected period, current containment, user action, and next update time. Do not speculate or expose another tenant's data.
4. Record all manual corrections as approved reversal/correction workflows with audit evidence.

## Aftercare

- Complete root-cause analysis with timeline, contributing controls, and detection gap.
- Add a regression test before closing a code defect.
- Review whether credentials, recovery codes, backups, or logs require rotation/retention action.
- Track every corrective action with owner and due date.
- Share a tenant-safe summary with affected pilot users.
