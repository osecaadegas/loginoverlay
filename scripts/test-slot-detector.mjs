import assert from 'node:assert/strict';
import {
  assertOwnedRecord,
  canUpdateActiveSlot,
  requireClientEventId,
  validateDetectedAt,
  validateDeviceRecord,
  validatePairingRecord,
} from '../api/_lib/slot-detector/core.js';
import {
  createDeviceToken,
  hashDetectorSecret,
} from '../api/_lib/slot-detector/crypto.js';
import {
  matchSlotFromEvidence,
} from '../api/_lib/slot-detector/matching.js';
import {
  normalizeKey,
  normalizeText,
  sanitizeDetectionPayload,
  sanitizeUrl,
} from '../api/_lib/slot-detector/sanitize.js';

const now = new Date('2026-07-15T12:00:00.000Z');

assert.equal(validatePairingRecord({ expires_at: '2026-07-15T12:05:00.000Z' }, now).ok, true);
assert.equal(validatePairingRecord({ expires_at: '2026-07-15T12:05:00.000Z', used_at: '2026-07-15T12:01:00.000Z' }, now).reason, 'used');
assert.equal(validatePairingRecord({ expires_at: '2026-07-15T11:59:00.000Z' }, now).reason, 'expired');

const token = createDeviceToken();
assert.match(token, /^scd_/);
assert.equal(hashDetectorSecret(token, 'secret'), hashDetectorSecret(token, 'secret'));
assert.notEqual(hashDetectorSecret(token, 'secret'), hashDetectorSecret(`${token}x`, 'secret'));

assert.equal(validateDeviceRecord({ token_scopes: ['slot:detect'], is_revoked: false }).ok, true);
assert.equal(validateDeviceRecord({ token_scopes: ['slot:detect'], is_revoked: true }).reason, 'revoked');
assert.equal(validateDeviceRecord({ token_scopes: ['profile:read'], is_revoked: false }).reason, 'scope');

assert.equal(validateDetectedAt('2026-07-15T11:55:00.000Z', now).ok, true);
assert.equal(validateDetectedAt('2026-07-15T11:40:00.000Z', now).reason, 'stale');
assert.equal(validateDetectedAt('2026-07-15T12:05:00.000Z', now).reason, 'future');
assert.equal(validateDetectedAt('not-a-date', now).reason, 'invalid_detected_at');

assert.equal(requireClientEventId('event-123456'), 'event-123456');
assert.throws(() => requireClientEventId('bad'), /clientEventId/);

assert.equal(canUpdateActiveSlot(null, '2026-07-15T12:00:00.000Z'), true);
assert.equal(canUpdateActiveSlot({ detected_at: '2026-07-15T12:00:00.000Z' }, '2026-07-15T12:01:00.000Z'), true);
assert.equal(canUpdateActiveSlot({ detected_at: '2026-07-15T12:01:00.000Z' }, '2026-07-15T12:00:00.000Z'), false);

const sanitized = sanitizeUrl('https://casino.example/play/game/123456789?token=secret&gameId=GATES-500&session=abc');
assert.equal(sanitized.domain, 'casino.example');
assert.equal(sanitized.pathPattern, '/play/game/:id');
assert.equal(sanitized.safeGameId, 'GATES-500');
assert.equal(Object.hasOwn(sanitized, 'url'), false);
assert.equal(sanitizeUrl('javascript:alert(1)').supported, false);

const payload = sanitizeDetectionPayload({
  topUrl: 'https://stake.com/casino/games/gates-of-olympus?session=secret',
  frameUrls: ['https://launcher.pragmaticplay.net/play?gameId=vs20olympgate&token=hidden'],
  title: 'Gates of Olympus - Stake',
  slotName: 'Gates of Olympus',
  providerHint: 'Pragmatic Play',
  confidence: 100,
  iframeSupported: false,
  crossOriginUnsupported: true,
});
assert.equal(payload.domain, 'stake.com');
assert.equal(payload.safeGameId, 'vs20olympgate');
assert.equal(payload.providerHint, 'Pragmatic Play');
assert.equal(payload.evidence.urls[1].safeGameId, 'vs20olympgate');
assert.equal(Object.hasOwn(payload, 'confidence'), false);

const shufflePayload = sanitizeDetectionPayload({
  topUrl: 'https://shuffle.com/casino/games/deal-with-death',
  title: 'Play Deal With Death Gambling Game by Hacksaw Gaming | Shuffle - VIP Crypto Casino',
  textHints: ['Play Deal With Death Gambling Game by Hacksaw Gaming | Shuffle - VIP Crypto Casino'],
  iframeSupported: false,
  crossOriginUnsupported: true,
});
assert.equal(shufflePayload.domain, 'shuffle.com');
assert.equal(shufflePayload.slotHint, 'Deal With Death');
assert.equal(shufflePayload.providerHint, 'Hacksaw Gaming');
assert.equal(shufflePayload.evidence.textHints[0], 'Deal With Death');

const slots = [
  { id: 'slot-1', name: 'Gates of Olympus', provider: 'Pragmatic Play', image: '/gates.png' },
  { id: 'slot-2', name: 'Wanted Dead or a Wild', provider: 'Hacksaw Gaming' },
  { id: 'slot-3', name: 'Deal With Death', provider: 'Hacksaw Gaming' },
];

const gameCodeMatch = matchSlotFromEvidence({
  evidence: { safeGameId: 'vs20olympgate', providerHint: 'Pragmatic Play', domain: 'pragmaticplay.net' },
  slots,
  aliases: [],
  gameCodes: [{ slot_id: 'slot-1', game_code_normalized: normalizeKey('vs20olympgate'), provider_key: normalizeKey('Pragmatic Play'), confidence_weight: 99 }],
});
assert.equal(gameCodeMatch.status, 'matched');
assert.equal(gameCodeMatch.confidence, 99);
assert.equal(gameCodeMatch.slot.id, 'slot-1');

const aliasMatch = matchSlotFromEvidence({
  evidence: { slotHint: 'Gates 500', providerHint: 'Pragmatic Play' },
  slots,
  aliases: [{ slot_id: 'slot-1', alias: 'Gates 500', alias_normalized: normalizeText('Gates 500'), provider_name: 'Pragmatic Play', confidence_weight: 96 }],
  gameCodes: [],
});
assert.equal(aliasMatch.status, 'matched');
assert.equal(aliasMatch.matchedBy, 'slot_alias');

const fuzzyMatch = matchSlotFromEvidence({
  evidence: { slotHint: 'Gates Of Olympos', providerHint: 'Pragmatic' },
  slots,
  aliases: [],
  gameCodes: [],
});
assert.equal(fuzzyMatch.slot.id, 'slot-1');
assert.equal(fuzzyMatch.confidence >= 85, true);

const shuffleTitleMatch = matchSlotFromEvidence({
  evidence: shufflePayload,
  slots,
  aliases: [],
  gameCodes: [],
});
assert.equal(shuffleTitleMatch.status, 'matched');
assert.equal(shuffleTitleMatch.slot.id, 'slot-3');
assert.equal(shuffleTitleMatch.confidence >= 90, true);

const unsupported = matchSlotFromEvidence({
  evidence: { crossOriginUnsupported: true, slotHint: '' },
  slots,
  aliases: [],
  gameCodes: [],
});
assert.equal(unsupported.status, 'unsupported');

assert.equal(assertOwnedRecord({ id: 'a', user_id: 'user-1' }, 'user-1').id, 'a');
assert.throws(() => assertOwnedRecord({ id: 'a', user_id: 'user-2' }, 'user-1', 'Event'), /Event not found/);

console.log('Slot Detector tests passed');
