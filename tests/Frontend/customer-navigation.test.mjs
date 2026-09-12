import assert from 'node:assert/strict';
import test from 'node:test';
import { quickActionHref } from '../../resources/js/layouts/customer/quick-action.ts';

test('quick actions only append scan mode when supported', () => {
    assert.equal(quickActionHref('/pos', 'manual'), '/pos');
    assert.equal(quickActionHref('/pos', 'scan'), '/pos?scan=1');
    assert.equal(quickActionHref('/operations/inventory', 'scan', false), '/operations/inventory');
});
