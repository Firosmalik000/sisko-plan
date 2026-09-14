import assert from 'node:assert/strict';
import test from 'node:test';
import { destinationKind, markPromotionShown, selectAppOpenPromotion, shouldShowPromotion } from '../../resources/js/lib/promotions.ts';

class MemoryStorage {
    values = new Map();
    getItem(key) {
        return this.values.get(key) ?? null;
    }
    setItem(key, value) {
        this.values.set(key, value);
    }
}

const promotion = (frequency, id = 'promo-1') => ({
    public_id: id,
    name: id,
    image_url: '/promotion.jpg',
    destination_url: null,
    updated_at: '2026-09-12T00:00:00.000Z',
    frequency,
});

test('destination classification accepts only internal paths and HTTP(S)', () => {
    assert.equal(destinationKind(null), 'none');
    assert.equal(destinationKind('/pricing'), 'internal');
    assert.equal(destinationKind('//evil.example'), 'none');
    assert.equal(destinationKind('/\\evil.example'), 'none');
    assert.equal(destinationKind('https://example.com'), 'external');
    assert.equal(destinationKind('javascript:alert(1)'), 'none');
});

test('once per session is capped by promotion version in session storage', () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    const item = promotion('once_per_session');
    assert.equal(shouldShowPromotion(item, session, local, '2026-09-12'), true);
    markPromotionShown(item, session, local, '2026-09-12');
    assert.equal(shouldShowPromotion(item, session, local, '2026-09-12'), false);
    assert.equal(shouldShowPromotion({ ...item, updated_at: '2026-09-13T00:00:00.000Z' }, session, local, '2026-09-12'), true);
});

test('once per day resets on the next local calendar day', () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    const item = promotion('once_per_day');
    markPromotionShown(item, session, local, '2026-09-12');
    assert.equal(shouldShowPromotion(item, session, local, '2026-09-12'), false);
    assert.equal(shouldShowPromotion(item, session, local, '2026-09-13'), true);
    assert.equal(shouldShowPromotion({ ...item, updated_at: '2026-09-13T00:00:00.000Z' }, session, local, '2026-09-12'), true);
});

test('once per campaign and every app open follow their frequency semantics', () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    const campaign = promotion('once_per_campaign');
    markPromotionShown(campaign, session, local, '2026-09-12');
    assert.equal(shouldShowPromotion(campaign, session, local, '2026-09-13'), false);
    assert.equal(shouldShowPromotion(promotion('every_app_open'), session, local, '2026-09-12'), true);
});

test('selection returns the first promotion that passes its cap', () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    const first = promotion('once_per_campaign', 'first');
    const second = promotion('once_per_campaign', 'second');
    markPromotionShown(first, session, local, '2026-09-12');
    assert.equal(selectAppOpenPromotion([first, second], session, local, '2026-09-12')?.public_id, 'second');
});
