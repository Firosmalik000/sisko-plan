# Phase 7 — Subscription and Platform Commercial Management

## Goal

Allow the SaaS operator to manage plans, trials, subscriptions, limits, payments, and store/user access.

## Dependencies

- Core store operation through Phase 6 complete.

## Scope

### Plans

- Name.
- Price.
- Billing period.
- Trial days.
- Maximum stores.
- Maximum products per store.
- Feature flags needed for Stage 1.
- Active/inactive.

### Subscription

- Trial.
- Active.
- Past due.
- Expired.
- Suspended.
- Cancelled.
- Start/end dates.
- Manual extension.
- Manual payment record.
- Limit enforcement.
- Grace-period decision.

### Platform management

- Dashboard metrics.
- User detail.
- Store detail.
- Subscription detail.
- Payment history.
- Suspend/reactivate user or store.
- Announcements.
- System settings required by Stage 1.
- Administrative audit.

## Out of scope

- Complex automated billing.
- Multiple payment gateways unless explicitly selected.
- Revenue recognition accounting.
- Enterprise contract billing.
- Unrestricted tenant impersonation.

## Critical rules

- Subscription payment is platform revenue, not store sales.
- Suspension behavior must preserve data.
- Expired users can access only explicitly allowed recovery/billing surfaces.
- Limits are enforced server-side.
- Admin actions are audited.

## Required tests

- Trial creation.
- Store limit.
- Product limit.
- Active subscription access.
- Expired/suspended behavior.
- Manual extension.
- Payment record.
- Platform/customer authorization separation.
- Admin audit.

## Acceptance criteria

- SaaS operator can onboard and manage paying users.
- Limits are consistent and safe.
- Store operational data remains preserved.
- Tests and builds pass.
