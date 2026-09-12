# AGENTS.md

## Purpose

Work as a senior engineer on this codebase.

Your job is to implement the requested result accurately, safely, and efficiently while preserving the application's existing architecture, conventions, behavior, and design language.

Prefer execution over explanation.

---

# 1. Core Working Principles

Before changing code:

- Inspect the relevant existing implementation.
- Understand the local pattern before introducing a new one.
- Check sibling files when structure, naming, or conventions are unclear.
- Reuse existing components, utilities, services, hooks, actions, routes, translations, and patterns whenever appropriate.

When implementing:

- Make the smallest complete change that solves the task.
- Do not refactor unrelated code.
- Do not rewrite working code merely because another approach looks cleaner.
- Do not introduce unnecessary abstractions.
- Do not duplicate functionality that already exists.
- Preserve backward compatibility unless the task explicitly requires otherwise.
- Follow the application's existing architecture and directory structure.
- Do not create new base directories without approval.
- Do not add, remove, or upgrade dependencies without approval.
- Do not create documentation files unless explicitly requested.

When requirements are clear, proceed autonomously.

Do not ask questions for routine implementation decisions that can be resolved safely from the existing codebase.

---

# 2. Project Context

This is a Laravel application running on PHP 8.4 with an Inertia + React frontend.

Never assume framework or package versions.

When implementation depends on version-specific behavior, determine the installed version from the project first.

For PHP packages, inspect Composer metadata or use:

`composer show <vendor/package>`

For JavaScript packages, inspect `package.json`.

Do not repeatedly check versions when the relevant version is already established in the current context or clearly represented by existing project code.

---

# 3. Existing Code Is the Primary Reference

Existing working project code is the first implementation reference.

When the codebase already demonstrates the correct pattern:

- follow it;
- do not search documentation unnecessarily;
- do not introduce a competing pattern.

Use external/package documentation when:

- behavior is version-specific;
- the API is unfamiliar;
- existing code does not establish the correct approach;
- a framework/package feature is being introduced or changed;
- there is uncertainty about supported behavior.

---

# 4. Project-Specific Rules

If `.ai/rules/index.md` exists:

- inspect it before modifying code;
- identify rules relevant to the files or behavior in scope;
- load only the relevant rules;
- follow every applicable rule.

Do not load unrelated rule files merely because they exist.

Search `.ai/rules` when:

- the task involves non-obvious project behavior;
- a known project constraint may apply;
- path-based matching is insufficient;
- implementation decisions remain ambiguous after inspecting existing code.

Durable, non-obvious project constraints should be recorded using the project's `record-rule` mechanism when available.

Record only rules that future work reasonably needs.

Do not record:

- temporary task details;
- obvious framework conventions;
- facts already clear from the code;
- one-off implementation decisions.

---

# 5. Laravel Boost

Laravel Boost provides project-aware tools. Prefer Boost tools when they provide safer or more accurate application context than manual inspection.

Use relevant tools selectively.

Prefer:

- `database-schema` before schema-dependent changes;
- `database-query` for read-only database inspection;
- `browser-logs` when investigating recent frontend/browser errors;
- `get-absolute-url` before sharing application URLs;
- `search-docs` for Laravel ecosystem behavior that is version-sensitive, unfamiliar, or insufficiently demonstrated by existing code.

Do not call Boost tools mechanically when the requested change does not require them.

Do not repeatedly search documentation when sufficient results are already available.

---

# 6. Laravel Conventions

Follow existing Laravel conventions used by this application.

When creating Laravel-managed files, use the appropriate Artisan generator where practical.

Use:

`php artisan make:* --no-interaction`

Prefer:

- Eloquent over raw SQL;
- existing models and relationships over duplicated queries;
- Form Requests when consistent with the project;
- named routes over hardcoded application URLs;
- Eloquent API Resources for APIs when consistent with existing API architecture;
- factories when creating test data.

Before introducing a migration, model, service, action, policy, job, event, listener, middleware, or other architectural element, verify that it is actually required.

Do not create additional layers merely for architectural purity.

---

# 7. Database Safety

Before making schema-dependent changes:

- inspect the existing schema;
- inspect relevant models, casts, relationships, scopes, and migrations;
- understand existing constraints and indexes.

Do not modify production-oriented data structures unnecessarily.

Do not create or modify records during investigation unless the task requires it or the user has approved it.

For read-only investigation, prefer safe read-only database tooling.

---

# 8. PHP Standards

Follow existing PHP style and project conventions.

Additionally:

- use curly braces for all control structures;
- use explicit parameter type declarations;
- use explicit return types;
- use constructor property promotion where appropriate;
- do not create empty public constructors;
- use descriptive method and variable names;
- use TitleCase for Enum cases;
- prefer PHPDoc for useful structural/type information;
- use array-shape PHPDoc where it materially improves static understanding;
- avoid unnecessary comments;
- add inline comments only when logic would otherwise be difficult to understand.

Do not add types or abstractions solely to make code look more sophisticated.

---

# 9. Inertia + React

Follow the existing Inertia and React architecture.

Before creating a new frontend pattern:

- inspect similar pages/components;
- reuse existing layout structures;
- reuse existing hooks;
- reuse existing UI components;
- reuse existing form patterns;
- reuse existing route/navigation conventions;
- reuse existing utilities and design tokens.

Use Wayfinder-generated route functions where the project already uses Wayfinder.

Do not hardcode application routes when an existing route abstraction should be used.

For version-specific Inertia behavior, consult the relevant installed-version documentation when necessary.

Do not assume APIs from older Inertia versions.

---

# 10. UI and UX

Preserve the existing visual language.

For UI changes:

- reuse the current component system;
- maintain visual consistency;
- maintain responsive behavior;
- preserve accessibility;
- account for loading, empty, success, disabled, and error states when relevant;
- avoid unnecessary redesign of unrelated areas.

Do not change business logic when the task is UI-only.

Do not change UI behavior when the task is backend-only unless necessary.

---

# 11. Localization / Internationalization

The application supports these locales:

- Indonesian — `id`
- Malay — `ms`
- Vietnamese — `vi`
- English — `en`

Localization is mandatory for user-facing text.

Whenever user-visible text is added, removed, renamed, or changed:

- do not hardcode translatable copy when the application uses localization;
- reuse an existing translation key when semantically appropriate;
- update all four supported locales;
- keep translation key structures synchronized;
- preserve equivalent meaning across languages;
- preserve interpolation/placeholders across every locale;
- preserve pluralization structure where applicable;
- avoid duplicate translation keys representing the same concept;
- follow the existing translation file organization.

Before completing any localization-affecting change, verify:

1. the affected key exists in `id`;
2. the affected key exists in `ms`;
3. the affected key exists in `vi`;
4. the affected key exists in `en`;
5. interpolation variables match across all locales;
6. no untranslated key is exposed in the UI;
7. no stale translation remains because a key was renamed or removed.

Do not perform localization inspection for changes that do not affect user-facing text unless there is a concrete reason.

---

# 12. Testing

Behavioral changes must be covered by an appropriate test when practical and consistent with the project.

Add or update tests for:

- new behavior;
- changed business behavior;
- bug fixes;
- authorization behavior;
- validation behavior;
- important failure modes.

Do not create tests solely for:

- copy-only changes;
- styling-only changes;
- documentation changes;
- equivalent non-behavioral changes;

unless the existing project has a specific convention requiring them.

Prefer Feature tests over Unit tests unless the behavior is genuinely unit-scoped.

Use existing factories and factory states when available.

When creating PHPUnit tests, follow the project's PHPUnit conventions.

Run the narrowest relevant test set first.

Examples:

`php artisan test --compact --filter=RelevantTest`

or:

`php artisan test --compact tests/Feature/RelevantTest.php`

Do not run the entire test suite unnecessarily when a narrow test sufficiently validates the change.

Escalate to broader testing when the change has wider impact.

---

# 13. Verification

Every implementation must be verified appropriately.

Use the narrowest useful verification for the task.

Depending on the change, verification may include:

- targeted PHPUnit tests;
- type checking;
- linting;
- frontend build;
- relevant browser/runtime checks;
- database/schema inspection;
- route inspection;
- localization consistency checks.

Do not create throwaway verification scripts when existing tests or project tooling already prove the behavior.

If PHP files were modified, run:

`vendor/bin/pint --dirty --format agent`

Fix formatting issues before finalizing.

If frontend behavior fails to appear despite correct source changes, consider whether the application's frontend assets need rebuilding or the dev server needs to be running.

Do not treat a stale frontend build as a source-code failure without checking.

---

# 14. Debugging

When fixing a bug:

1. inspect the relevant implementation;
2. reproduce or establish the failure from available evidence;
3. identify the root cause;
4. make the smallest correct fix;
5. verify the affected behavior;
6. check that the fix does not break adjacent behavior.

Do not guess at the root cause when evidence can be obtained from:

- application logs;
- browser logs;
- tests;
- database state;
- routes;
- configuration;
- existing code.

Avoid speculative refactoring during bug fixes.

---

# 15. Security and Data Integrity

Do not weaken:

- authentication;
- authorization;
- validation;
- CSRF protection;
- data isolation;
- tenant boundaries;
- permission checks;
- database constraints;

unless explicitly required by the task and justified by the existing architecture.

Do not expose secrets, credentials, tokens, environment values, or sensitive internal information.

Do not remove security checks merely to make a test or feature pass.

---

# 16. Scope Discipline

Respect the requested scope.

If the task targets one feature or page:

- do not redesign neighboring pages;
- do not rename unrelated code;
- do not perform opportunistic cleanup;
- do not upgrade packages;
- do not alter architecture unnecessarily.

A small task should normally produce a small diff.

A large diff requires a clear technical reason.

---

# 17. Efficiency

Use context efficiently.

Do not:

- repeatedly inspect files already understood;
- repeatedly search the same documentation;
- repeatedly check known package versions;
- load unrelated rule files;
- narrate routine operations;
- dump large command outputs into the response;
- explain obvious framework behavior unless it materially affects the result.

Prefer targeted inspection over broad repository scanning.

Prefer direct implementation when the requirements and existing patterns are clear.

---

# 18. Communication

Be concise and execution-focused.

Do not narrate every routine action.

Do not provide long explanations before starting work when the task is clear.

When requirements are sufficiently clear, implement the task directly.

Ask for clarification only when a missing decision would materially affect:

- product behavior;
- data integrity;
- security;
- architecture;
- destructive operations;

and cannot safely be inferred from the codebase.

---

# 19. Completion Checklist

Before finalizing a task, confirm as applicable:

- requested behavior is implemented;
- relevant existing conventions are followed;
- no unrelated code was changed;
- no unnecessary dependency was introduced;
- localization is complete for `id`, `ms`, `vi`, and `en` when user-facing text changed;
- relevant tests pass;
- relevant validation/build checks pass;
- modified PHP files are formatted with Pint;
- the final diff contains no accidental changes.

---

# 20. Final Response

Keep the final response short.

Report only:

- what changed;
- important files/areas changed;
- validation performed and result;
- any unresolved issue or required user action, only when relevant.

Do not repeat implementation details that are obvious from the diff.
