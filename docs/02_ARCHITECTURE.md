# Architecture

## System shape

- Laravel modular monolith.
- Inertia drives the UI contract.
- React and TypeScript power the frontend.
- MySQL is the shared database.
- Session authentication is the default authentication model.

## Core architecture choices

- Keep business logic on the server.
- Use Laravel routes, middleware, requests, policies, actions, and services for domain behavior.
- Keep React pages thin and focused on presentation and interaction.
- Scope every operational query to the active store.
- Use separate platform-admin and store-owner surfaces where needed.

## Directory guidance

- Put backend domain code in `app/`.
- Put database migrations, factories, and seeders in `database/`.
- Put the Inertia frontend in `resources/js/`.
- Keep shared UI primitives centralized and reusable.

## Domain boundaries

- Identity and tenancy must be explicit.
- Master data, inventory, finance, purchasing, sales, and reporting are separate domain areas.
- Each phase may add tables and services, but should not blur boundaries unnecessarily.

## Authoritative values

- The server is authoritative for totals, costs, margins, balances, and document sequencing.
- The client can assist with interaction, but never owns the business truth.

## Operational concerns

- Prefer atomic database transactions for posted business flows.
- Use audit trails for sensitive administrative actions.
- Use idempotency or duplicate-protection where submission retries are possible.

## Technology discipline

- Do not split the app into separate frontend and backend products in Stage 1.
- Do not introduce microservices.
- Do not replace MySQL unless explicitly requested.
