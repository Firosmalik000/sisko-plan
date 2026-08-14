# Phase 7 - Subscription and SaaS Platform Management

## Status

Completed

## Required Outcomes

- Platform admins can manage active commercial plans and their usage limits.
- Every store has one subscription with a plan, lifecycle status, and billing period.
- Existing stores receive a safe default subscription during migration.
- Platform admins can change store subscriptions and record immutable manual subscription payments.
- Store owners/admins can view their current plan, usage, billing period, and payment history.
- Expired or non-operational subscriptions preserve read access but block new store writes.
- Product and active-member limits are enforced server-side and audited platform actions remain separate from store data.

## Scope Decisions

- Subscription is per store, not per user account.
- `trialing` and `active` subscriptions can write while their relevant date window is valid.
- `past_due`, `suspended`, `cancelled`, and expired subscriptions are read-only.
- Zero limits mean unlimited; positive limits count active products and active memberships.
- A default free-compatible plan backfills existing stores and is assigned to newly created stores.
- Payments are manually verified platform records in Stage 1; no gateway integration is implied.

## Out of Scope

- Automated payment gateways, checkout, coupons, taxes, prorating, refunds, multi-currency, usage metering, invoice PDFs, dunning automation, and revenue recognition.
