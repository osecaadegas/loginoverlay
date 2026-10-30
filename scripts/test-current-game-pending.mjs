import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createServer } from 'vite';
import { buildCurrentGameResult } from '../shared/slotPersonalBest.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const pendingId = '33333333-3333-4333-8333-333333333333';
const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { currentGameSearchResults, ownedPendingCurrentGameSlots } = await server.ssrLoadModule(
    '/src/components/OverlayCenter/widgets/current-slot/currentSlotModel.js',
  );

  await test('Current Game includes only the submitter own pending slots alongside live catalog matches', () => {
    const submissions = [
      { id: pendingId, submitted_by: owner, status: 'pending', name: 'Sleeping Dragon Ultra', provider: 'Pragmatic Play', image: '/dragon.png', rtp: 96.5 },
      { id: other, submitted_by: other, status: 'pending', name: 'Sleeping Dragon Other', provider: 'Pragmatic Play' },
      { id: '44444444-4444-4444-8444-444444444444', submitted_by: owner, status: 'denied', name: 'Sleeping Dragon Denied' },
    ];
    const live = [{ id: '55555555-5555-4555-8555-555555555555', name: 'Sleeping Dragon Live', provider: 'Pragmatic Play' }];
    const matches = currentGameSearchResults(live, submissions, owner, 'sleeping dragon');
    assert.deepEqual(ownedPendingCurrentGameSlots(submissions, owner).map(row => row.name), ['Sleeping Dragon Ultra']);
    assert.deepEqual(matches.map(row => row.name), ['Sleeping Dragon Ultra', 'Sleeping Dragon Live']);
    assert.equal(matches[0].pendingApproval, true);
    assert.equal(matches[0].id, pendingId);
    assert.equal(matches[0].rtp, 96.5);
    assert.equal(currentGameSearchResults(live, submissions, other, 'sleeping dragon')[0].name, 'Sleeping Dragon Other');
    assert.deepEqual(currentGameSearchResults(live, submissions, owner, 's'), []);

    const result = buildCurrentGameResult(owner, matches[0], '1', '20', '66666666-6666-4666-8666-666666666666');
    assert.equal(result.slot_name, 'Sleeping Dragon Ultra');
    assert.equal(result.slot_provider, 'Pragmatic Play');
  });

  await test('Current Game marks slot titles as nontranslatable across its editor and render styles', () => {
    const files = [
      '../src/components/OverlayCenter/widgets/current-slot/CurrentSlotConfig.jsx',
      '../src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.jsx',
      '../src/components/OverlayCenter/widgets/current-slot/CompactSlotPortrait.jsx',
      '../src/effects/ThemeEffects/galactic-command/GalacticCommandTheme.jsx',
    ];
    for (const file of files) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      assert.match(source, /translate="no"/);
      assert.match(source, /className="notranslate"/);
    }
  });
} finally {
  await server.close();
}
