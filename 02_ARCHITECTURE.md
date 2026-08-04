# Security and Tenancy

## Threat model priorities

1. Cross-store data leakage.
2. Unauthorized Platform Admin access.
3. Manipulated totals, prices, costs, and IDs.
4. Duplicate transaction submission.
5. Broken transaction rollback.
6. Unsafe file upload.
7. Exposed production secrets or errors.
8. Destructive administrative action without audit.

## Store authorization

Every store route must verify:

- User authentication.
- Active membership.
- Store status.
- Subscription allowance where relevant.
- Action-specific policy.

A user must not be able to access another store by changing a URL ID.

## Relationship validation

For every submitted relational ID:

- Query it through the active store.
- Reject records from another store.
- Recalculate money and quantity effects on the server.

Never accept authoritative:

- `store_id`
- `owner_id`
- `unit_cost`
- `cogs`
- `gross_profit`
- `inventory_value`
- `outstanding_amount`
- `status`

from browser input without server derivation and validation.

## Platform Admin

- Separate authentication surface.
- Strong password.
- 2FA before production.
- Rate limiting.
- Audit all sensitive actions.
- No unrestricted impersonation in Stage 1.
- No password viewing or retrieval.

## Session and web security

- Keep CSRF enabled.
- Regenerate session after login.
- Use secure cookies in production.
- Apply HTTPS.
- Use framework escaping.
- Avoid rendering untrusted HTML.
- Rate-limit login, password reset, and sensitive writes.

## Upload security

- Validate MIME type and extension.
- Limit file size.
- Generate server-controlled file names.
- Store private files outside directly executable paths.
- Authorize downloads.
- Do not trust original file names.

## Audit requirements

Audit:

- Login and logout where practical.
- Store creation and status changes.
- Product price changes.
- Posted, cancelled, reversed, and returned transactions.
- Stock adjustments.
- Capital changes.
- Subscription changes.
- Platform Admin actions.

## Environment safety

Before database-destructive commands:

1. Inspect environment.
2. Confirm it is local or test.
3. Avoid production credentials.
4. Prefer isolated test database.

Never run `migrate:fresh`, truncate, or reset against an unknown database.
