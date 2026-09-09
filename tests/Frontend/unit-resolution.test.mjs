import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveUnit, resolveCategory, referenceLabel } from '../../resources/js/lib/unit-references.ts';

test('category resolution uses stable codes and refuses unknown or duplicate mappings', () => {
    const category = { public_id: 'c', reference_code: 'networking_equipment', is_active: true };
    assert.equal(resolveCategory([category], 'networking_equipment')?.public_id, 'c');
    assert.equal(resolveCategory([category, { ...category, public_id: 'd' }], 'networking_equipment'), undefined);
    assert.equal(resolveCategory([{ ...category, reference_code: 'other' }], 'other'), undefined);
});

test('standard labels translate but custom names remain unchanged', () => {
    const record = { name: 'Bottle', reference_code: 'bottle', name_is_custom: false };
    const translate = (key) => (key === 'units.bottle' ? 'Chai' : key);
    assert.equal(referenceLabel(record, 'units', translate), 'Chai');
    assert.equal(referenceLabel({ ...record, name_is_custom: true, name: 'Botol toko' }, 'units', translate), 'Botol toko');
    assert.equal(referenceLabel({ ...record, reference_code: 'new_code' }, 'units', translate), 'Bottle');
});

const bottle = { public_id: 'a', reference_code: 'bottle', unit_type: 'retail', is_active: true };

test('resolves identity independently of custom labels and language', () => {
    assert.equal(resolveUnit([{ ...bottle, name: 'Nama toko' }], 'bottle', 'retail')?.public_id, 'a');
});

test('never chooses an arbitrary mapping when ambiguous', () => {
    assert.equal(resolveUnit([bottle, { ...bottle, public_id: 'b' }], 'bottle', 'retail'), undefined);
});

test('unknown, inactive and wrong role stay unselected', () => {
    assert.equal(resolveUnit([bottle], null, 'retail'), undefined);
    assert.equal(resolveUnit([bottle], 'bottle', 'large'), undefined);
    assert.equal(resolveUnit([{ ...bottle, is_active: false }], 'bottle', 'retail'), undefined);
    assert.equal(resolveUnit([{ ...bottle, reference_code: null }], 'bottle', 'retail'), undefined);
});
