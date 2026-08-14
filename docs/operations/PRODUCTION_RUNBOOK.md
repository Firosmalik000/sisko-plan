# Production Runbook

## Purpose

This runbook is the minimum repeatable procedure for deploying and operating the Stage 1 pilot. Replace example process-manager and database commands with the approved hosting implementation, but do not remove their safety checks.

## Required Services

- PHP 8.4 web runtime with required Laravel extensions.
- MySQL with InnoDB and utf8mb4.
- Persistent cache and session backend.
- Asynchronous queue worker.
- Scheduler invoking `php artisan schedule:run` every minute.
- HTTPS termination with correctly configured trusted proxies.
- External log collection and uptime checks for `/up` and `/ready`.
- Encrypted database backups stored outside the application host.

## Required Environment

- `APP_ENV=production`, `APP_DEBUG=false`, and a unique generated `APP_KEY`.
- HTTPS `APP_URL` with `APP_FORCE_HTTPS=true`.
- `SESSION_SECURE_COOKIE=true`, `SESSION_ENCRYPT=true`, `SESSION_HTTP_ONLY=true`, and `SESSION_SAME_SITE=lax` or `strict`.
- `PLATFORM_ADMIN_2FA_REQUIRED=true` after every active Platform Admin enrolls.
- `SECURITY_CSP_ENABLED=true` and `SECURITY_HSTS_ENABLED=true` after HTTPS verification.
- MySQL, persistent cache/session, asynchronous queue, production mail, `LOG_LEVEL=info`, and an externally collected log channel.
- Secrets must be injected by the hosting secret store and must never be committed.

Run `php artisan app:production-check` on the release host. A non-zero exit is a deployment blocker, not a warning to ignore.

## First Production Enrollment

1. Deploy with HTTPS enabled and `PLATFORM_ADMIN_2FA_REQUIRED=true`.
2. Sign in with the bootstrap Platform Admin password.
3. The middleware redirects the admin to `/super-admin/security`.
4. Enroll TOTP, confirm a current code, and store recovery codes in the approved password vault.
5. Run `php artisan app:production-check` and confirm every critical check passes.
6. Remove or rotate any bootstrap credentials shared during provisioning.

## Deployment

1. Confirm CI is green and identify the exact release commit.
2. Announce the maintenance window and stop new deployments.
3. Create and verify a pre-deploy database backup.
4. Build an immutable release with `composer install --no-dev --classmap-authoritative` and `npm ci && npm run build`.
5. Point environment configuration and writable storage to the release.
6. Run `php artisan migrate --force` once from one release host.
7. Run `php artisan optimize`.
8. Run `php artisan app:production-check`; stop if it fails.
9. Switch traffic to the release and restart queue workers with `php artisan queue:restart`.
10. Verify `/up`, `/ready`, login, store switch, a read-only report, and one approved pilot write.
11. Monitor error rate, queue failures, database load, and request IDs for at least 30 minutes.

Do not run `migrate:fresh`, truncate commands, or destructive schema commands in production.

## Backup And Restore

### Backup

1. Use a database account restricted to backup duties.
2. Create a transaction-consistent MySQL backup, for example `mysqldump --single-transaction --routines --triggers --no-tablespaces DATABASE > backup.sql`.
3. Encrypt the artifact before transfer.
4. Store it outside the application host with retention appropriate to the pilot agreement.
5. Record timestamp, source database, schema version, encrypted checksum, size, and operator.
6. Alert when a scheduled backup is missing, empty, or has a changed failure status.

Never put a database password directly in shell history. Use the platform secret mechanism or a protected MySQL option file.

### Restore Drill

1. Provision an isolated non-production MySQL instance with no production network access from users.
2. Verify the encrypted checksum and decrypt the selected backup.
3. Restore the backup, configure a temporary application release, and run `php artisan migrate:status`.
4. Verify representative users, stores, subscriptions, stock balances, cash balances, sales, purchases, expenses, and audit logs.
5. Reconcile at least one known sale and its stock/cash ledger effects.
6. Destroy the temporary restored data securely after approval.
7. Record recovery time and any deviation. Perform this drill before pilot and at least quarterly.

## Rollback

1. Stop traffic switching and preserve logs/request IDs.
2. Prefer rolling application code back to the previous immutable release when its schema is forward-compatible.
3. Do not run `migrate:rollback` blindly; posted ledger data and new columns may make a down migration destructive.
4. If schema/data rollback is unavoidable, enter maintenance mode, preserve the failed database, and restore the verified pre-deploy backup.
5. Run the previous release's smoke checks before reopening traffic.
6. Document the incident and reconciliation performed.

## Monitoring Minimums

- `/up`: process liveness only.
- `/ready`: database and cache readiness; body intentionally contains no dependency detail.
- HTTP 5xx and 429 rates.
- Queue failures and worker availability.
- Database capacity, connections, slow queries, storage, and backup success.
- Login failures, Platform Admin security audit events, store suspension, and subscription changes.
- Disk usage for logs and private files.

Use `X-Request-ID` to correlate user reports, HTTP logs, and exceptions. It is diagnostic metadata, not authorization evidence.
