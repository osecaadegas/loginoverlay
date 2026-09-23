import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { pickBestWinRecord, resolveConfigBestWin, resolveCurrentHuntBestWin } from '../src/utils/slotPersonalBestDisplay.js';

const activeSlot = { id: 'slot-a', name: 'Test Slot', provider: 'Test Provider' };
const cached = { userId: 'owner-a', slotId: 'slot-a', slotName: activeSlot.name, best_win: 8450, best_multiplier: 845 };
const resolveCache = (overrides = {}) => resolveConfigBestWin({
  slotName: activeSlot.name, activeSlot, userId: 'owner-a', cached, allWidgets: [], ...overrides,
});
assert.equal(resolveCache().best_win, 8450);
assert.equal(resolveCache({ userId: 'owner-b' }), null, 'Never reuse another owner cache');
assert.equal(resolveCache({ activeSlot: { id: 'slot-b', name: 'Other Slot' } }), null, 'Never reuse another slot cache');
const bonuses = [
  { id: 'hunt-row-1', slot_id: activeSlot.id, slot_name: activeSlot.name, provider: activeSlot.provider, bet: 2, payout: 600, opened: true },
  { id: 'hunt-row-2', slot_id: activeSlot.id, slot_name: activeSlot.name, provider: activeSlot.provider, bet: 1, opened: false },
];
const currentBest = resolveCurrentHuntBestWin({ activeSlot, bonuses, isLive: true });
assert.equal(currentBest.best_win, 600);
assert.equal(currentBest.best_multiplier, 300);
assert.equal(pickBestWinRecord([resolveCache(), currentBest]).best_win, 8450, 'Historical best wins over the current hunt');
assert.equal(pickBestWinRecord([resolveCache(), { best_win: 9000, best_multiplier: 450 }]).best_win, 9000, 'New larger payout wins');

globalThis.window = { location: { origin: 'http://localhost' } };
const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BetterBonusHuntStyle } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx');
  const { createBetterInstance, renderBetterWidgetInstance } = await server.ssrLoadModule('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
  const allWidgets = [{ widget_type: 'rtp_stats', config: { _cachedBestWin: cached } }];
  for (const orientation of ['mainstream', 'vertical', 'horizontal']) {
    const html = renderToStaticMarkup(createElement(BetterBonusHuntStyle, {
      config: { orientation, carouselMode: 'imagestats', sessionState: 'opening', animations: false, showRequests: false },
      bonuses, stats: {}, currency: '€', userId: 'owner-a', allWidgets,
    }));
    assert.match(html, /€8[,.]450\s*\/\s*845x/, `${orientation}: image stats uses the saved personal best amount and multiplier`);
    const withoutHistory = renderToStaticMarkup(createElement(BetterBonusHuntStyle, {
      config: { orientation, carouselMode: 'imagestats', sessionState: 'opening', animations: false, showRequests: false },
      bonuses, stats: {}, currency: '€',
    }));
    assert.match(withoutHistory, /€600\s*\/\s*300x/, `${orientation}: queued slot retains its earlier win in this hunt`);
  }
  for (const chatStyle of ['classic', 'better_chat', 'broadcast_chat', 'community_chat']) {
    const instance = createBetterInstance('chat', { config: { chatStyle, live: false } });
    const layout = { instances: [instance] };
    const sample = renderToStaticMarkup(renderBetterWidgetInstance({ instance, layout, mode: 'mock' }));
    assert.match(sample, /!so RaidLeader/, `${chatStyle}: sample mode contains a moderator shoutout command`);
    assert.match(sample, /CommunityVIP/, `${chatStyle}: sample mode contains VIP messages`);
    assert.match(sample, /LoyalSub/, `${chatStyle}: sample mode contains subscriber messages`);
    for (const runtime of ['editor', 'obs']) {
      const live = renderToStaticMarkup(renderBetterWidgetInstance({ instance, layout, mode: 'live', runtime }));
      assert.doesNotMatch(live, /!so RaidLeader|CommunityVIP|LoyalSub/, `${chatStyle}: ${runtime} live mode has no sample messages`);
    }
    assert.equal(instance.config.__appearancePreviewMessages, undefined, 'Sample messages are not persisted to the widget');
  }
  console.log('Hunt best-win selection, owner/slot isolation, carousel output, and chat sample/live isolation passed.');
} finally {
  await server.close();
}
