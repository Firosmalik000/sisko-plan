# Southeast Asian Localization Design

## Goal

Support the eleven Southeast Asian markets with ten primary interface locales while making English the canonical authored copy and preserving market-specific currency and timezone behavior.

## Locale and market model

Markets and locales are independent. The supported locales are `en`, `fil`, `id`, `km`, `lo`, `ms`, `my`, `tet`, `th`, and `vi`. Brunei and Malaysia share Malay; Singapore defaults to English. A detected market chooses the first-visit locale, currency, and timezone, while an explicit user locale remains authoritative.

## Translation ownership

- React owns browser-rendered interface copy under `resources/js/lang/{locale}`.
- Laravel owns validation, authentication, notification, receipt, and server-originated messages under `lang/{locale}`.
- User-entered names and technical identifiers are never translated.
- Reference data uses stable semantic keys such as `units.bottle` and `categories.food`.
- General interface copy uses polished canonical English messages as IDs. This follows the repository's extractor and Laravel JSON conventions without inventing thousands of unstable page-position keys.

## Catalog organization

Frontend catalogs are split by durable product domain and composed by each locale's `index.ts`. They are bundled as one lazy chunk per non-English locale. English is the source and fallback. Only the active locale and English fallback may be resident at initial render.

Backend JSON catalogs contain server message translations. Laravel's standard grouped files remain grouped (`auth.php`, `validation.php`, `passwords.php`, `pagination.php`, and `countries.php`). No translated country-name columns are added to the database.

## Copy quality

English copy is rewritten in flow context, uses sentence case, and follows a compact retail glossary. Machine translation may seed non-English catalogs, but placeholders, protected product terms, and meaning are checked. A locale must have complete catalog parity before being offered. Native-language review remains the release-quality gate for production copy.

## Runtime behavior

The locale registry is canonical in each runtime. The browser preloads the document locale before React renders, lazily loads a new locale before switching, caches loaded catalogs, updates `<html lang>`, and falls back to English for a missing entry. It never calls a translation service at runtime.

## Verification

Automated checks cover all ten locale codes, eleven country defaults, catalog/key parity, non-empty values, placeholder parity, untranslated UI literals, locale switching, formatting, server output, type checking, linting, static analysis, tests, and production builds. Manual checks cover long translated labels, narrow layouts, keyboard access, and 200% zoom without browser automation.

## Constraints

- Preserve all pre-existing dirty work and do not touch the mobile worktree.
- Do not add application dependencies, database translation columns, runtime translation calls, compatibility routes, or speculative abstractions.
- Remove the Indonesian-source regex/lexicon path after active callers and catalogs have migrated.
- Do not commit.
