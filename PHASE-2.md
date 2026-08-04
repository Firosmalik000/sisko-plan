# Phase 0 — Product Specification and Repository Foundation

## Goal

Prepare the repository so implementation can proceed consistently and safely.

## Required outcomes

- Confirm Laravel, Inertia, React, TypeScript, MySQL, Tailwind, test framework, lint, and build setup.
- Install only genuinely missing baseline dependencies.
- Establish repository conventions.
- Confirm environment examples without committing secrets.
- Create initial architecture and database plan.
- Confirm all project documents are present.
- Create initial CI or documented local verification commands.
- Create base factories/test setup.
- Create an initial implementation backlog.

## Scope

- Repository audit.
- Version compatibility assessment.
- Authentication starter-kit decision.
- Folder conventions.
- Formatting/linting/test commands.
- Environment and database safety.
- Initial ERD.
- Initial route map.
- Initial ExecPlan structure.
- Documentation alignment.

## Out of scope

- Full business modules.
- POS implementation.
- Purchasing implementation.
- Subscription implementation.

## Required artifacts

- `.agent/plans/phase-0-foundation.md`
- Updated `docs/07_DECISIONS.md`
- Repository-specific command list.
- ERD draft or database design document.
- Phase backlog.

## Tests and verification

- Existing test suite runs.
- Frontend build runs.
- Clean test database connection verified.
- No secrets committed.

## Acceptance criteria

- Stack and commands are known.
- Conflicts with blueprint are documented.
- Repository can be built and tested.
- Phase 1 has a clear executable plan.
