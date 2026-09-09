# Unit Reference Integration Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Do not delegate without user authorization.

**Goal:** Reliable unit selection across intelligence and Sisko, independent of language, with safe unknown handling and maintained references.

**Architecture:** Intelligence owns the curated reference catalog. Sisko stores a durable local replica and tenant-owned unit mappings; product units own packaging conversions. Discovery proposes facts and never determines unconfirmed inventory conversions.

**Tech Stack:** Existing Python/FastAPI/Pydantic, Laravel, React/TypeScript and locale catalogs; no new dependency or service.

**Spec:** The agreed requirements and decisions below capture the conversation of 2026-09-09.

## Requirements and decisions

- No Playwright. Run backend, contract, type, lint, formatting and locale checks; disclose that responsive visual verification remains unperformed unless verified by another authorized method.
- Match stable reference codes and allowed roles, never translated names. Keep tenant custom names unchanged.
- One catalog definition per code; roles can overlap, including pack as sale and large. Keep role-specific API projections only where active consumers require them, generated from that definition.
- Preserve existing discovery code values. Inventory all consumers before changing reference response shape; migrate active callers in the same release if a breaking change is required.
- Standard measurement conversion and product packaging conversion are distinct. Net content is optional descriptive data, not an implicit stock conversion.
- Unknown sale unit stays null; missing reference mapping is distinct from missing operational unit. A custom tenant unit can be fully usable with reference_code=null.
- Product drafts may be incomplete. A stock-enabled product requires a chosen base unit before use in transactions. A large unit is optional; when used it needs a confirmed positive conversion consistent with existing business rules.
- Base-to-self conversion is 1. Never manufacture an unknown package conversion as 1.
- Maintain tenant isolation, decimal arithmetic, idempotency and historical transaction snapshots.

## Task 1: Reference and discovery contract

Files: intelligence-service/app/unit_references.py, app/api/v1/reference_data.py, app/schemas/discovery.py, app/discovery_normalization.py, tests/unit/test_discovery_schema.py; add tests/unit/test_unit_references.py.

- [ ] Test unique canonical codes, overlapping roles, current discovery codes, unknown inputs and incomplete net-content pairs.
- [ ] Consolidate catalog metadata into a single definition per code, deriving role projections and validation sets rather than duplicating metadata.
- [ ] Add catalog_version to the existing reference response. Keep code meanings immutable; deprecated references remain resolvable for existing data and cannot be newly selected.
- [ ] Return structured unit issue codes for missing/unsupported observations. Preserve bounded observed text when present; do not fabricate text for an unreadable image.
- [ ] Validate conversion dependency on known sale and large units. Discard ungrounded conversion proposals with a structured issue; do not treat AI output as confirmed stock configuration.
- [ ] Verify tests, API schema and documented Python quality commands from pyproject.toml/README.

Contract: reference response has catalog_version and data containing stable code, role information, dimension, symbol and fractional capability. Discovery retains sale_unit_code, larger_unit_code, net_content and conversion_factor; unknown values remain null.

## Task 2: Durable reference synchronization

Files: sisko-plan/app/Services/Intelligence/CatalogIntelligenceClient.php; create app/Console/Commands/SyncIntelligenceUnits.php, app/Models/UnitReference.php, database/migrations/2026_09_09_000001_create_unit_references_table.php, tests/Feature/Intelligence/SyncUnitReferencesTest.php; modify routes/console.php.

- [ ] Test valid import, unchanged-version no-op, duplicate code rejection, malformed payload, timeout, concurrent invocation and failed import preserving the previous catalog.
- [ ] Persist code, roles, dimension, symbol, fractional capability, selectability and catalog version in a global local reference table. Reference names are fallback labels, not tenant unit names.
- [ ] Extend the existing client with the actively used reference endpoint call; implement php artisan intelligence:sync-units in the command directly.
- [ ] Fetch outside the database transaction; validate the complete response, then atomically apply it. Serialize sync jobs using the existing shared locking infrastructure. Fail without clearing the previous catalog.
- [ ] Schedule daily synchronization without overlap. Run initial sync as an explicit release step; no migration performs remote HTTP.
- [ ] Test unavailable catalog behavior: existing local units and custom-unit creation still work; standard-reference creation requires an available local reference.

## Task 3: Tenant mappings and migration

Files: app/Models/Unit.php, app/Http/Requests/MasterData/UnitRequest.php, app/Http/Controllers/MasterData/UnitController.php, app/Actions/Stores/SeedStoreStarterData.php; create database/migrations/2026_09_09_000002_add_reference_code_to_units_table.php and tests/Feature/MasterData/UnitReferenceMappingTest.php.

- [ ] Add nullable reference_code linked to local references. Keep tenant public IDs as operational identifiers.
- [ ] Validate reference selectability and allowed role on creation/remapping, and tenant ownership on unit use. Explicitly map Sisko retail to catalog sale at the integration boundary.
- [ ] Allow existing duplicate tenant mappings without destructive merges. Auto-resolve only exactly one active unit for the requested code and role; require a choice when ambiguous.
- [x] Preserve existing tenant definitions; link references explicitly through the master-data form. No automatic legacy-data mapping.
- [ ] Seed new stores with explicit reference associations when the local catalog exists. Ensure initial sync precedes normal store provisioning; catalog downtime must not break existing stores.
- [ ] Test custom units, cross-tenant selection rejection, role mismatch, ambiguous mappings and renamed units retaining identity.

## Task 4: Product form and multilingual fallback

Files: resources/js/pages/customer/master-data/products/index.tsx, use-product-drafts.ts, existing unit management page, existing product save request/action, resources/js/lang/{id,ms,en,vi}/application.ts; add tests/Feature/MasterData/ProductUnitSelectionTest.php.

- [ ] Resolve discovery codes against active local tenant units by reference_code and role. Remove unitCodeAliases and name-based runtime matching once migrated callers use codes.
- [ ] Known unique mapping: prefill. Known reference without tenant unit: offer add from reference. Unknown or ambiguous: show a unit selector. Missing desired unit: permit authorized custom creation.
- [ ] Reuse existing draft handling so incomplete products remain drafts. Inspect current mandatory-large-unit validation and persistence, then make large packaging optional throughout save/edit/serialization; test base-only products end to end at the backend.
- [ ] Prefill supported net-content and quantity fields as proposals without overwriting edited draft values. Review existing persistence before adding product fields; keep one structured representation for persisted net content.
- [ ] Require explicit review of a proposed packaging factor before activation. Validate stock precision and fractional sale policy server-side against the product selling mode and chosen unit.
- [ ] Localize standard unit labels by code and issue messages by issue code in all four locales. Fallback to reference label then code if untranslated; keep custom labels verbatim. Extend locale coverage checks to Vietnamese if the current audit omits it.
- [ ] Test unknown draft preservation, sale-unit requirement, base-only sales, unconfirmed packaging rejection, net content not becoming conversion, tenant isolation and locale-independent matching.

## Task 5: Maintenance, verification and release

- [ ] Document catalog updates through Git review, source/provenance notes and catalog_version changes. Standards guide unit identity; SKU-specific manufacturer/packaging evidence guides package contents.
- [ ] Record bounded unknown terms and user corrections with market/language context under existing privacy/retention rules. Aggregate recurring terms for manual curation; never globally learn one store's correction automatically.
- [ ] Publish catalog metadata before synchronizing Sisko, then migrate mappings and enable code-based selection. Preserve old transaction snapshots and confirmed product conversions across updates.
- [ ] Run intelligence documented tests/lint/type checks; in sisko-plan run composer ci:check, npm run i18n:check and npm run build. Add focused tests to the standard suites rather than inventing a new runner.
- [ ] Review the final diff for unused public methods, pass-through classes, duplicated metadata, runtime aliases and obsolete callers. The local replica is a resilience boundary, not an independently maintained catalog.
- [ ] Report changed files, actual check outputs, migration counts and remaining visual-verification limits. No completion claim before verification.

## Acceptance examples

| Input | Expected behavior |
|---|---|
| bottle recognized; mapped unit renamed by store | Same local unit selected in every UI locale |
| bottle recognized; no store mapping | Add-from-reference action, no silent new unit |
| unidentified unit | null proposal, manual selector, incomplete draft retained |
| custom local unit with no standard equivalent | Usable after explicit user selection; reference_code remains null |
| bottle with 600 ml net content | Descriptive net content; no inferred 600-unit stock conversion |
| unknown carton count | Base-unit operations allowed; carton operation unavailable until configured |
| two tenant units mapped to bottle | User selects; first database row is never chosen arbitrarily |
| sync outage or invalid response | Last complete local catalog and existing transactions remain available |

## Status

Implementation is in progress on feat/unit-reference-integration in both repositories.

### Implementation decisions

- Net content remains structured discovery/draft data, displayed in the form; no unused product persistence fields were introduced.
- Existing incomplete scan drafts remain in the current page session, with navigation protection. They are not durable server-side drafts.
- Product quantity_mode is persisted independently of catalog metadata. Existing products default to variable to preserve fractional sales; new and edited forms expose the policy explicitly. Fixed sales reject fractional selling quantities server-side.
- Packaging remains required for shared variants because those variants represent large-unit sales. Products without shared packaging can omit the large unit.
- Unknown bounded unit observations are retained inside the existing external_ai_usage.response_data discovery records. No new telemetry store or automatic global learning is added. Operators can curate recurring observations under the existing retention policy; user custom definitions remain tenant-owned.
- Old persisted discovery responses without unit_issues remain readable through a default empty list, required for existing idempotency replay.
- Work uses dedicated feature branches in the current checkouts to preserve existing uncommitted edits; no stash, destructive reset, commits, pushes or deployments.
- Browser/viewport verification is not performed; user explicitly requested no Playwright.

### Release procedure

1. Release the updated intelligence reference endpoint and discovery response together. Known workspace callers have been migrated from type to roles; external consumers must adopt roles before using this response.
2. In Sisko run `php artisan migrate --force` using the normal release procedure.
3. Run `php artisan intelligence:sync-units`. A failed command retains the previous complete local catalog; resolve configured service access before retrying.
4. Run `php artisan intelligence:sync-categories`. Populate both reference catalogs before creating new stores so starter data receives standard codes. Existing category/unit definitions remain unchanged; users can associate them through the master-data forms.
5. Ensure the existing scheduler runs. Daily sync is non-overlapping and imports reference metadata only; product factors, tenant names, quantities and old transaction snapshots are untouched.
6. Build/release the frontend. Verify selecting a standard or custom unit in the existing form, and a base-only product sale.

### Verification record

- Frontend resolver: unknown, inactive, wrong-role and ambiguous mapping cases covered with Node's built-in test runner (`npm run test:units`), added to composer ci:check.
- Four-locale unit-label coverage is checked by the existing i18n audit using the real translate resolver.
- Focused backend tests cover sync import/no-op/invalid response/outage/locking, mappings, optional large unit and fixed/variable sales.
- Full verification outputs and final limitations will be recorded below before completion.


### Final verification and deployment boundary

- Intelligence full suite: 308 passed in 128.04s before the final additive persisted-response and application-auth regressions; focused suite rerun after those changes.
- Sisko full PHPUnit suite: 313 tests, 312 passed, 2840 assertions; archived-store permanent deletion fails with a foreign-key error reproduced on untouched HEAD in an isolated temporary checkout.
- Full composer CI stops at six pre-existing resource formatting violations. Running composer test separately reaches PHPStan and reports 112 errors outside this change; changed backend files have zero PHPStan errors. Pint passes.
- Local environment already reports all three new migrations applied when inspected; this agent did not run migrations against the application database.
- Real synchronization was attempted and failed safely. Configured service is the remote https://api.xsisten.com, which still requires namespace authentication for this endpoint. Local intelligence code now correctly uses application authentication and has a regression test; deploy that service change before rerunning sync.
- No production deployment or automatic tenant-data mapping was performed. Existing reference rows are retained on failed sync.

### Category extension verification (latest local run)

- Intelligence exposes 39 category references using the existing `department_code`; modem/router, physical SIM cards and GPS trackers have distinct categories.
- Standard master labels use Indonesian, English, Malay and Vietnamese translations; custom tenant names remain literal. Unknown or ambiguous suggestions remain unselected.
- Category/unit backfill command and tests have been removed. Daily synchronization only updates reference catalogs.
- Sisko focused backend suite: 61 passed, 584 assertions. Frontend reference tests: 5 passed. TypeScript, ESLint, i18n audit, changed-file Prettier, Pint and production build passed.
- Intelligence category endpoint and unit reference tests: 58 passed. Both repositories pass `git diff --check`.
- Local category migrations 000004–000006 were applied successfully without resetting or associating existing tenant records.
- Current category changes remain uncommitted and unpushed in both repositories. Live category synchronization still requires deploying the Intelligence changes; this run verifies the integration through automated fixtures, not a deployed category endpoint.

### Automatic defaults after reference synchronization

Both `intelligence:sync-categories` and `intelligence:sync-units` now add missing active defaults to every store after a valid catalog response, including unchanged versions. They reuse `SeedStoreStarterData::syncReferences` with new-store initialization. Each store has its own transaction and row lock; failed stores are reported, later stores continue, and rerunning retries safely. Existing mappings, custom names/symbols and inactive tenant rows are retained. Name/symbol conflicts are skipped and reported. No product mappings or conversions are rewritten.

The separate `stores:sync-defaults` command and adoption mode have been removed. Run the two intelligence commands or let the existing daily scheduler run them. Category changes in Intelligence were already pushed separately; these Sisko changes remain uncommitted.
