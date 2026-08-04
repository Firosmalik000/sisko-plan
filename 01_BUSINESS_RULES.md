# ExecPlan Standard

Use an ExecPlan for every numbered phase and for any complex change that spans multiple business workflows, tables, or UI surfaces.

## Location

```text
.agent/plans/phase-N-short-name.md
```

For follow-up work:

```text
.agent/plans/YYYY-MM-DD-task-name.md
```

## Purpose

An ExecPlan is a living implementation record, not only a preliminary outline.

It must be updated while work proceeds.

## Required sections

```markdown
# Title

## Status
Planned / In Progress / Blocked / Completed

## Goal

## Repository State
What exists now, relevant versions, patterns, and tests.

## Required Documents Read

## Dependencies and Prerequisites

## Scope

## Out of Scope

## Business Rules

## Architecture Decisions

## Database Changes
Tables, columns, constraints, indexes, migration ordering, rollback.

## Backend Changes
Routes, middleware, requests, policies, actions, services, events.

## Frontend Changes
Pages, components, states, responsiveness, accessibility.

## Security and Tenancy Review

## Transaction and Concurrency Strategy

## Testing Strategy

## Implementation Milestones
- [ ] Milestone 1
- [ ] Milestone 2

## Progress Log
Dated entries of work completed.

## Discoveries and Deviations
Unexpected repository facts and justified changes to plan.

## Commands Executed
Only commands actually run.

## Verification Results

## Remaining Risks and Limitations

## Completion Summary
```

## Rules

- Inspect the repository before writing the plan.
- Do not invent files or patterns without checking.
- Keep scope aligned with the phase document.
- Record conflicts with existing code or docs.
- Update checkboxes and progress as implementation proceeds.
- Do not mark completed when verification is failing.
- If blocked, report the exact blocker and preserve completed safe work.
