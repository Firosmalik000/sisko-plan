# Frontend language catalogs

Each locale owns a folder under `resources/js/lang`:

- `id` is the Indonesian source UI.
- `ms` is the Malay UI for the Malaysia market.
- `en` is the English UI offered inside customer portals.
- `vi` is the Vietnamese UI for the Vietnam market.

Catalog files are grouped by responsibility:

- `common.ts` contains shared labels and framework-level copy.
- `public.ts` contains public landing and pricing copy.
- `application.ts` contains customer and platform application copy.
- `reviewed.ts` contains final Malay corrections that must override other maps.
- `lexicon.ts` contains safe word-level fallbacks for dynamic phrases.

Add exact phrases to the narrowest matching feature file. Do not put catalogs
back into `lib/i18n.ts`; that file only resolves locale state and runtime
patterns. Tenant-entered data such as store, product, supplier, and customer
names must remain unchanged.

Run `npm run i18n:check` after changing visible UI text or a catalog. The audit
must pass for both Malay and English output before the change is complete.
