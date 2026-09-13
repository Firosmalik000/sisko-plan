import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('shared dialogs do not mutate browser history when they open or close', () => {
    const dialog = source('../../resources/js/components/overlays/responsive-dialog.tsx');

    assert.doesNotMatch(dialog, /history\.pushState|history\.back/u);
});

test('the complete page header never becomes a sticky overlay', () => {
    const appPage = source('../../resources/js/components/page/app-page.tsx');

    assert.doesNotMatch(appPage, /max-lg:sticky/u);
});

test('mobile sheets use a gesture-capable drawer with a visible handle', () => {
    const dialog = source('../../resources/js/components/overlays/responsive-dialog.tsx');

    assert.match(dialog, /from 'vaul'/u);
    assert.match(dialog, /<Drawer\.Handle/u);
    assert.equal(dialog.match(/<DialogFooter/g)?.length, 2);
});

test('customer CSS does not globally reposition every dropdown and select', () => {
    const css = source('../../resources/css/app.css');

    assert.doesNotMatch(css, /\[data-slot='dropdown-menu-content'\][\s\S]*\[data-slot='select-content'\]/u);
});

test('compact child pages render their back navigation in the customer top bar', () => {
    const header = source('../../resources/js/layouts/customer/customer-header.tsx');

    assert.match(header, /customerPageParent/u);
    assert.match(header, /parentDestinationHrefs\[contextualPage\.destination\]/u);
    assert.match(header, /contextualPage\.title/u);
});

test('product filters keep draft choices separate until the user applies them', () => {
    const products = source('../../resources/js/pages/customer/master-data/products/index.tsx');

    assert.match(products, /filterDraft/u);
    assert.match(products, /openFilters/u);
    assert.match(products, /applyFilterDraft/u);
});

test('global search uses the generated customer search route', () => {
    const search = source('../../resources/js/layouts/customer/global-search.tsx');

    assert.match(search, /customerRoutes\.search\.url/u);
    assert.doesNotMatch(search, /`\/search\?q=/u);
});

test('settings does not render a second compact back button in its body', () => {
    const settings = source('../../resources/js/layouts/settings/layout.tsx');

    assert.doesNotMatch(settings, /href="\/more"/u);
});
