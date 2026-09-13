# Frontend language catalogs

English is the canonical interface copy and fallback. Each published locale
owns the same message IDs under `resources/js/lang/{locale}`. Catalog files are
grouped into `auth`, `customer`, `platform`, `public`, and `shared`, then
composed by the locale's `index.ts`.

Use complete English messages for general interface copy. Stable reference
data keeps semantic IDs such as `units.bottle` and `categories.food`.
Tenant-entered store, product, supplier, and customer data must remain
unchanged.

Run `npm run i18n:check` after changing visible copy or a catalog. Every
published locale must have matching, non-empty output and preserve dynamic
placeholders.
