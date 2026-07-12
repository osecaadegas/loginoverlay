import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  READINESS_STATUSES,
  SERVICE_IDS,
  buildFinalServiceReview,
  commandPreview,
  currencySymbolForCode,
  normalizeCommandName,
  normalizeCommandPrefix,
  normalizeSetupDetails,
  summarizeReadiness,
  validateCommandConfiguration,
  validatePointSettings,
} from '../shared/serviceSetupModel.js';
import { safeExternalDestination, serviceLinks } from '../shared/serviceLinks.js';

let count = 0;
function test(name, fn) {
  fn();
  count += 1;
  console.log(`ok ${count} - ${name}`);
}

const componentSource = readFileSync(new URL('../src/components/OverlayCenter/setup/ConnectServicesStep.jsx', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../src/services/serviceReadinessService.js', import.meta.url), 'utf8');

test('Twitch login is prefilled and normalized from integrations', () => {
  const details = normalizeSetupDetails({}, { twitchChannel: '#OSeCaaDegas', twitchDisplayName: 'Os e Caa Degas' });
  assert.equal(details.twitchChannel, 'osecaadegas');
  assert.equal(details.twitchDisplayName, 'Os e Caa Degas');
});

test('OAuth return progress has an explicit save callback', () => {
  assert.match(componentSource, /onSaveProgress/);
  assert.match(componentSource, /Save progress/);
});

test('Focus and visibility return rechecks are registered', () => {
  assert.match(componentSource, /window\.addEventListener\('focus'/);
  assert.match(componentSource, /document\.addEventListener\('visibilitychange'/);
});

test('Focus return readiness recheck is debounced', () => {
  assert.match(componentSource, /setTimeout\(\(\) => runChecks\('focus'\), 900\)/);
});

test('Readiness API uses bearer auth rather than query tokens', () => {
  assert.match(clientSource, /Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(clientSource, /access_token=/);
});

test('Guided setup does not write or render secrets in client fields', () => {
  assert.doesNotMatch(componentSource, /localStorage/);
  assert.doesNotMatch(clientSource, /localStorage/);
  assert.doesNotMatch(componentSource, /se_jwt_token|access_token|refresh_token|client_secret/i);
});

test('Command names are stored without chat prefixes', () => {
  assert.equal(normalizeCommandName('!SR'), 'sr');
  assert.equal(normalizeCommandName('/bet'), 'bet');
  assert.equal(normalizeCommandName('.join'), 'join');
});

test('Command prefixes are capped to three characters', () => {
  assert.equal(normalizeCommandPrefix('!!!!'), '!!!');
  assert.equal(normalizeCommandPrefix(''), '!');
});

test('Duplicate chat commands are blocking validation errors', () => {
  const validation = validateCommandConfiguration({ slotRequestCommand: '!sr', betCommand: '/sr', giveawayKeyword: 'join' });
  assert.ok(validation.errors.some(error => error.includes('unique')));
});

test('Invalid command characters are rejected', () => {
  const validation = validateCommandConfiguration({ slotRequestCommand: 'slot request', betCommand: 'bet', giveawayKeyword: 'join' });
  assert.ok(validation.errors.some(error => error.includes('letters')));
});

test('Command previews combine prefix, command and sample text', () => {
  assert.equal(commandPreview('?', 'sr', 'Book of Dead'), '?sr Book of Dead');
});

test('Giveaway keyword is canonicalized without a prefix', () => {
  const details = normalizeSetupDetails({ giveawayKeyword: '!Join' });
  assert.equal(details.giveawayKeyword, 'join');
});

test('Legacy StreamElements point flags infer the StreamElements source', () => {
  const details = normalizeSetupDetails({ requestsUsePoints: true, betsUsePoints: false });
  assert.equal(details.pointSource, 'streamelements');
  assert.equal(details.pointsEnabled, true);
});

test('No-points mode clears charge flags', () => {
  const details = normalizeSetupDetails({ pointSource: 'none', requestsUsePoints: true, betsUsePoints: true });
  assert.equal(details.requestsUsePoints, false);
  assert.equal(details.betsUsePoints, false);
  assert.equal(details.pointsEnabled, false);
});

test('Negative point costs are validation errors', () => {
  const validation = validatePointSettings({ requestCost: -1, giveawayEntryCost: -2 });
  assert.ok(validation.errors.some(error => error.includes('Slot request cost')));
  assert.ok(validation.errors.some(error => error.includes('Giveaway entry cost')));
});

test('Bet maximum below minimum is a validation error', () => {
  const validation = validatePointSettings({ betMinAmount: 100, betMaxAmount: 50 });
  assert.ok(validation.errors.some(error => error.includes('Maximum bet')));
});

test('Default bet must stay inside the range', () => {
  const validation = validatePointSettings({ betMinAmount: 10, betMaxAmount: 20, defaultBetAmount: 25 });
  assert.ok(validation.errors.some(error => error.includes('Default bet')));
});

test('Currency is stored as an ISO code and rendered from metadata', () => {
  assert.equal(normalizeSetupDetails({ currency: '\u20ac' }).currencyCode, 'EUR');
  assert.equal(normalizeSetupDetails({ currencyCode: 'usd' }).currencyCode, 'USD');
  assert.equal(currencySymbolForCode('USD'), '$');
});

test('Safe destinations reject scripts and token-bearing URLs but keep internal routes', () => {
  assert.equal(safeExternalDestination('javascript:alert(1)', '/fallback'), '/fallback');
  assert.equal(safeExternalDestination('https://example.com/callback?access_token=secret', '/fallback'), '/fallback');
  assert.equal(safeExternalDestination('https://example.com/callback#refresh_token=secret', '/fallback'), '/fallback');
  assert.equal(safeExternalDestination('/overlay-center/setup#slot-data', '/fallback'), '/overlay-center/setup#slot-data');
});

test('Centralized service links do not contain secret query parameters', () => {
  const urls = [
    serviceLinks.twitch.dashboard,
    serviceLinks.twitch.channelSettings,
    serviceLinks.twitch.channel('O Se Caa Degas'),
    serviceLinks.streamElements.dashboard,
    serviceLinks.streamElements.loyalty,
    serviceLinks.streamElements.publicCommands('O Se Caa Degas'),
    serviceLinks.spotify.player,
    serviceLinks.spotify.appAccess,
    serviceLinks.slotProviders.sloteller.home,
  ];
  assert.ok(urls.every(url => !/[?&#](access_token|refresh_token|id_token|client_secret|jwt)=/i.test(url)));
  assert.ok(!serviceLinks.twitch.channel('O Se Caa Degas').includes(' '));
});

test('Music modes normalize Spotify, manual and disabled states', () => {
  assert.equal(normalizeSetupDetails({ spotifyMode: 'spotify' }).musicMode, 'spotify');
  const manual = normalizeSetupDetails({ musicMode: 'manual', manualTrack: ' Song ', manualArtist: ' Artist ' });
  assert.equal(manual.manualTrack, 'Song');
  assert.equal(manual.manualArtist, 'Artist');
  assert.equal(normalizeSetupDetails({ musicMode: 'disabled' }).musicMode, 'disabled');
});

test('Manual slot source enables fallback and trims sample search text', () => {
  const details = normalizeSetupDetails({ slotSource: 'manual', manualSlotFallback: false, sampleSlotName: ' Gates of Olympus ' });
  assert.equal(details.slotSource, 'manual');
  assert.equal(details.manualSlotFallback, true);
  assert.equal(details.sampleSlotName, 'Gates of Olympus');
});

test('Readiness summary blocks only required unfinished capabilities', () => {
  const summary = summarizeReadiness([
    { id: 'optional-error', service: SERVICE_IDS.MUSIC, status: READINESS_STATUSES.ERROR, blocking: false },
    { id: 'required-fallback', service: SERVICE_IDS.SLOT_DATA, status: READINESS_STATUSES.FALLBACK, blocking: true },
    { id: 'required-ready', service: SERVICE_IDS.TWITCH, status: READINESS_STATUSES.READY, blocking: true },
  ]);
  assert.equal(summary.canContinue, true);
  assert.equal(summary.requiredCompleted, 2);
  const blocked = summarizeReadiness([{ id: 'required-warning', service: SERVICE_IDS.TWITCH, status: READINESS_STATUSES.WARNING, blocking: true }]);
  assert.equal(blocked.canContinue, false);
});

test('Final service review displays commands, currency and fallback choices', () => {
  const review = buildFinalServiceReview({ commandPrefix: '?', slotRequestCommand: 'sr', betCommand: 'bet', currencyCode: 'GBP', slotSource: 'manual', manualSlotFallback: true });
  assert.deepEqual(review.twitch.commands, ['?sr', '?bet']);
  assert.equal(review.currency, 'GBP - \u00a3');
  assert.equal(review.slotData.manualFallback, 'Enabled');
});

assert.equal(count, 24, 'expected 24 service setup behavior tests');
console.log(`\n${count} service setup behavior tests passed.`);