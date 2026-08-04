# Phase 1 — Identity, Platform Admin, and Multi-Store

## Goal

Create secure customer and platform identities, one-account-to-many-store support, store switching, and tenant isolation.

## Dependencies

- Phase 0 complete or repository equivalent proven.

## Scope

### Customer identity

- Register.
- Login/logout.
- Email verification if supported.
- Password reset.
- User status.

### Platform Admin

- Separate Platform Admin authentication.
- Super Admin seed/bootstrap mechanism that does not expose production credentials.
- Minimal Platform dashboard.
- User and store administrative listings.
- Suspend/reactivate capability with audit.

### Store

- Create store.
- Store profile.
- `store_users` membership.
- Stage 1 `owner` role.
- Store switcher.
- Authorized Store Context.
- Store status.
- Base audit log.
- Route and policy boundaries.

## Out of scope

- Product master.
- Inventory.
- Sales.
- Payments.
- Detailed subscription billing.
- Impersonation.
- Additional store roles.

## Suggested tables

- users
- platform_admins
- stores
- store_users
- store_settings
- audit_logs
- admin_audit_logs

## Required tests

- User registration and login.
- Platform Admin cannot use customer area without membership.
- Customer cannot use Platform Admin area.
- Owner creates multiple stores.
- Owner switches stores.
- User cannot view/update/delete another user's store.
- Suspended store access is denied.
- Manipulated `store_id` is rejected.
- Admin suspend action is audited.

## Acceptance criteria

- One user can safely manage multiple stores.
- Cross-store access is proven denied.
- Platform and store management are separated.
- All relevant tests, lint, and build pass.
