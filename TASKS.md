# Codex Workflow — Sistem Toko Stage 1

This repository kit makes phase execution intentionally simple.

## Normal usage

After placing these files in the repository root, the user can give Codex a minimal command:

```text
Phase 1
```

or:

```text
Kerjakan Phase 5
```

`AGENTS.md` defines what that short command means. Codex must read the phase specification, inspect the repository, create or update an ExecPlan, implement, test, review, and report.

## Recommended first command

For an existing repository:

```text
Audit repository
```

Use `prompts/AUDIT_REPOSITORY.md` when a fuller instruction is needed.

For a new repository, start with:

```text
Phase 0
```

## Recommended sequence

1. Phase 0 — Product specification and repository foundation
2. Phase 1 — Identity, Platform Admin, and multi-store tenancy
3. Phase 2 — Master data
4. Phase 3 — Inventory, cash, and capital ledgers
5. Phase 4 — Purchasing and supplier payable
6. Phase 5 — POS, sales, COGS, and returns
7. Phase 6 — Expenses, dashboards, and reports
8. Phase 7 — Subscription and platform commercial management
9. Phase 8 — Hardening, pilot, and production readiness

Do not skip phases unless the repository already proves the prerequisite behavior with code and tests.

## Repository placement

Copy the contents of this kit into the root of the Laravel repository:

```text
project-root/
├── AGENTS.md
├── README_AGENT_WORKFLOW.md
├── docs/
├── .agent/
├── prompts/
└── templates/
```

Keep application source files in their normal Laravel locations.

## Working habits

- Create a Git checkpoint before each phase.
- Use Plan mode for phase work.
- Review the ExecPlan before large irreversible design decisions.
- Review the diff after implementation.
- Keep each phase in a separate branch when possible.
- Do not accept completion when tests or build commands were not run.

## Short commands

### Implement phase

```text
Phase 2
```

### Review completed phase

```text
Review Phase 2
```

### Repair phase

```text
Fix Phase 2
```

### Continue interrupted phase

```text
Lanjutkan Phase 2 dari ExecPlan yang ada
```

### Audit only

```text
Audit repository tanpa mengubah kode
```
