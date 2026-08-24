# Phase 7 - Subscription and SaaS Platform Management

## Status

Completed

## Required Outcomes

- Platform admins can manage active commercial plans and their usage limits.
- Every owner account has one subscription with a plan, lifecycle status, and billing period shared by its owned stores.
- Existing owner accounts receive a safe default subscription during migration.
- Platform admins can change account subscriptions and record immutable manual subscription payments.
- Store owners/admins can view their current plan, usage, billing period, and payment history.
- Expired or non-operational subscriptions preserve read access but block new store writes.
- Store, product, and distinct active-staff limits are enforced across all stores owned by the account; the owner does not consume a staff seat, and audited platform actions remain separate from store data.

## Scope Decisions

- Subscription is per owner account, not per store.
- `trialing` and `active` subscriptions can write while their relevant date window is valid.
- `past_due`, `suspended`, `cancelled`, and expired subscriptions are read-only.
- Zero limits mean unlimited; positive limits count owned stores, active products, and distinct active staff across the account. The owner account is excluded from the staff count.
- A default free-compatible plan backfills existing owner accounts and is assigned when an account creates its first store.
- Payments are manually verified platform records in Stage 1; no gateway integration is implied.
- The canonical 30-day trial plan is maintained by an idempotent seeder and identified by `plans.is_trial`, not by its display name or price.
- Trial usage is durable per account through `subscriptions.trial_used_at`; an expired trial remains unavailable after switching plans.
- Until gateway checkout is implemented, an expired owner may confirm a paid plan from public pricing for immediate activation using the plan's configured 1–12 month duration without creating a payment record.
- An operational owner may renew or queue another paid plan; periods are sequential, non-overlapping, account-scoped, and visible in subscription history.

## Out of Scope

- Automated payment gateways, checkout, coupons, taxes, prorating, refunds, multi-currency, usage metering, invoice PDFs, dunning automation, and revenue recognition.
