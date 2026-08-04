# Architecture

## Architecture style

Use a Laravel modular monolith with Inertia React.

The objective is fast Stage 1 delivery without placing business rules inside controllers or UI components.

## Suggested domain boundaries

```text
app/
├── Domain/
│   ├── Platform/
│   ├── Identity/
│   ├── Store/
│   ├── Catalog/
│   ├── Inventory/
│   ├── Finance/
│   ├── Purchasing/
│   ├── Sales/
│   ├── Subscription/
│   └── Reporting/
├── Http/
├── Models/
├── Policies/
└── Support/
```

The exact structure may follow an established repository pattern, but domain boundaries must remain recognizable.

## Write-flow pattern

```text
Route
→ Middleware
→ Route model binding / Store Context
→ Policy
→ Form Request
→ Action
→ Database transaction and row locks
→ Models and ledger records
→ Response
```

## Read-flow pattern

```text
Route
→ Store authorization
→ Query or report service
→ Paginated result
→ Inertia page
```

## Store Context

Store Context should provide the current authorized store to backend services.

Requirements:

- Resolved server-side.
- Validated against membership.
- Reject suspended or unauthorized stores.
- Never derived only from hidden form input.
- Easy to substitute in automated tests.

## Platform area

Suggested route separation:

```text
/platform/*
```

or:

```text
/admin/*
```

Customer application:

```text
/app/stores/{store}/*
```

The repository should choose one naming convention and apply it consistently.

## Action design

Examples:

- `CreateStoreAction`
- `PostPurchaseAction`
- `RecordPurchasePaymentAction`
- `ContributeCashCapitalAction`
- `ContributeInventoryCapitalAction`
- `PostPosSaleAction`
- `ReturnSaleAction`
- `RecordExpenseAction`
- `TransferFinancialAccountAction`

Actions own business orchestration. Controllers do not.

## Events and jobs

Use events/jobs only where they add value.

Critical ledger writes remain synchronous inside the transaction.

Non-critical actions can run after commit:

- Email.
- Export generation.
- Low-stock notification.
- Analytics projection.

## API readiness

Do not build a separate API application in Stage 1.

Actions and policies should remain reusable by future API controllers.

## Reporting

Complex reports use dedicated query services.

Do not load all records into PHP when SQL aggregation is appropriate.

Every report query must be store-scoped and date-filterable.
