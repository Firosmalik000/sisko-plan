# Phase N — ExecPlan

## Status

Planned

## Goal

## Repository State

## Required Documents Read

- [ ] `AGENTS.md`
- [ ] Active phase file
- [ ] Business rules
- [ ] Architecture
- [ ] Database standards
- [ ] Security and tenancy
- [ ] Testing and quality
- [ ] UI/UX standards
- [ ] Existing relevant tests

## Dependencies and Prerequisites

## Scope

## Out of Scope

## Business Rules

## Architecture Decisions

## Database Changes

## Backend Changes

## Frontend Changes

## UI/UX Implementation Rules

### Responsive Verification

Every frontend change must be verified at all of these viewport widths:

- [ ] `xs` — 320px
- [ ] `sx` — 375px
- [ ] `sm` — 640px
- [ ] `md` — 768px
- [ ] `lg` — 1024px
- [ ] `xl` — 1280px
- [ ] `2xl` — 1536px

`xs` and `sx` are QA viewport labels even when they are not framework breakpoints.
At every width, verify navigation, forms, tables, cards, dialogs, spacing,
touch targets, text wrapping, and empty states. There must be no unintended
horizontal page overflow, clipped controls, overlapping content, or hidden
primary actions. Record the results under `Verification Results`.

### Interface Copy

- Do not add helper text by default.
- Prefer clear labels, concise headings, visible status, and direct actions.
- Do not add decorative explanations, repeated instructions, marketing copy,
  or paragraphs that restate what the interface already communicates.
- Helper text is allowed only when it prevents a likely input error, explains
  an irreversible or security-sensitive consequence, or communicates a
  business rule that cannot be made clear through the control and its label.
- When helper text is necessary, keep it to one short, actionable sentence.
- Keep management interfaces compact, scannable, and task-oriented.

## Security and Tenancy Review

## Transaction and Concurrency Strategy

## Testing Strategy

## Implementation Milestones

- [ ] Repository audit
- [ ] Schema and migrations
- [ ] Backend domain
- [ ] Authorization and validation
- [ ] Frontend
- [ ] Responsive verification (`xs`, `sx`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [ ] Interface copy review (no unnecessary helper text)
- [ ] Automated tests
- [ ] Verification
- [ ] Diff review
- [ ] Documentation
- [ ] Completion report

## Progress Log

## Discoveries and Deviations

## Commands Executed

## Verification Results

## Remaining Risks and Limitations

## Completion Summary
