# Testing and Quality

## Quality goals

- Protect store isolation.
- Protect financial correctness.
- Protect transaction atomicity.
- Keep the UI usable for non-technical owners.
- Keep the codebase maintainable and predictable.

## Required test types

- Unit tests for pure domain logic.
- Feature tests for route and policy behavior.
- Transaction tests for posted business workflows.
- Cross-store denial tests.
- Regression tests for bug fixes.
- Browser checks where the UI flow is important.

## Minimum verification set

- Test suite passes.
- Type check passes.
- Lint passes.
- Production build passes.
- Relevant migrations run cleanly on a test database.

## Focus areas

- Authorization.
- Validation.
- Rounding and decimal safety.
- Duplicate submission protection.
- Rollback behavior on failure.
- Cross-store relationship rejection.
- Printable and responsive UI states.

## Test data guidance

- Use factories and seeders where appropriate.
- Keep tests isolated and deterministic.
- Prefer small fixtures that make failures easy to understand.

## Acceptance discipline

- Do not mark a phase complete if the core verification commands fail.
- Document any unverified area explicitly.
- Record residual risk when a test gap remains.
