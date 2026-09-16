import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    cashierContextLabel,
    paymentChoicesForChannel,
    shouldShowWorkspaceSwitcher,
    visibleByCapability,
} from '../../resources/js/lib/pos-operations-contract.ts';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('capability filtering and workspace switcher use one explicit contract', () => {
    const destinations = [{ title: 'Team', capability: 'team.view' }, { title: 'Profile' }];

    assert.deepEqual(visibleByCapability(destinations, []), [{ title: 'Profile' }]);
    assert.equal(shouldShowWorkspaceSwitcher(1, 1), false);
    assert.equal(shouldShowWorkspaceSwitcher(2, 1), true);
    assert.equal(shouldShowWorkspaceSwitcher(1, 2), true);
});

test('checkout choices are channel-specific and cashier context stays compact', () => {
    const methods = [{ method: 'cash' }, { method: 'e_wallet' }];
    const marketplaces = [{ code: 'shopee' }, { code: 'tokopedia' }];

    assert.deepEqual(paymentChoicesForChannel('in_store', methods, marketplaces), methods);
    assert.deepEqual(paymentChoicesForChannel('marketplace', methods, marketplaces), marketplaces);
    assert.equal(cashierContextLabel('Ayu', 'Front', 'SHIFT-10'), 'Ayu · Front · SHIFT-10');
});

test('terminal PIN is numeric, six digits, and terminal surfaces honor safe areas', () => {
    const lock = source('../../resources/js/pages/terminal/lock.tsx');
    const layout = source('../../resources/js/layouts/terminal-layout.tsx');

    assert.match(lock, /inputMode="numeric"/u);
    assert.match(lock, /pattern="\[0-9\]\*"/u);
    assert.match(lock, /maxLength=\{6\}/u);
    assert.match(layout, /safe-area-inset-top/u);
    assert.match(layout, /safe-area-inset-bottom/u);
});

test('staff form reveals email only for personal-device access', () => {
    const team = source('../../resources/js/pages/customer/team/index.tsx');

    assert.match(team, /personal_device_access/u);
    assert.match(team, /data\.personal_device_access &&/u);
    assert.doesNotMatch(team, /pos_pin_hash/u);
});
