import { HIGH_CONFIDENCE_THRESHOLD } from './constants.js';
import { normalizeKey, normalizeText } from './sanitize.js';

function diceCoefficient(a, b) {
  const left = normalizeText(a).replace(/\s+/g, '');
  const right = normalizeText(b).replace(/\s+/g, '');
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const counts = new Map();
  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    counts.set(pair, (counts.get(pair) || 0) + 1);
  }
  let hits = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = counts.get(pair) || 0;
    if (count > 0) {
      counts.set(pair, count - 1);
      hits += 1;
    }
  }
  return (2 * hits) / (left.length + right.length - 2);
}

function providerMatches(left, right) {
  if (!left || !right) return false;
  const a = normalizeText(left);
  const b = normalizeText(right);
  return a === b || a.includes(b) || b.includes(a);
}

function shapeSlot(slot) {
  if (!slot) return null;
  return {
    id: slot.id || slot.slot_id || null,
    name: slot.name || slot.slot_name || '',
    provider: slot.provider || slot.provider_name || '',
    image: slot.image || slot.image_url || slot.slot_image_url || '',
    rtp: slot.rtp ?? null,
    volatility: slot.volatility || null,
    max_win_multiplier: slot.max_win_multiplier ?? null,
  };
}

export function confidenceStatus(confidence, slot) {
  if (!slot) return confidence > 0 ? 'low_confidence' : 'unmatched';
  return confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'matched' : 'low_confidence';
}

export function matchSlotFromEvidence({
  evidence = {},
  slots = [],
  aliases = [],
  gameCodes = [],
} = {}) {
  const reasons = [];
  const providerHint = evidence.providerHint || '';
  const slotHint = evidence.slotHint || evidence.pageTitleHint || '';
  const slotHintNorm = normalizeText(slotHint);
  const gameIdNorm = normalizeKey(evidence.safeGameId || '');
  const domain = normalizeKey(evidence.domain || '');
  const providerKey = normalizeKey(providerHint || domain);

  if (gameIdNorm) {
    const mapped = gameCodes.find((row) => {
      const rowCode = normalizeKey(row.game_code_normalized || row.game_code || '');
      const rowProvider = normalizeKey(row.provider_key || row.provider || '');
      const rowDomain = normalizeKey(row.domain || '');
      return rowCode === gameIdNorm
        && (!rowProvider || !providerKey || rowProvider === providerKey || providerKey.includes(rowProvider) || rowProvider.includes(providerKey))
        && (!rowDomain || !domain || rowDomain === domain || domain.endsWith(rowDomain));
    });
    if (mapped) {
      const slot = shapeSlot(mapped.slot || slots.find((item) => item.id === mapped.slot_id));
      if (slot) {
        reasons.push('provider_game_code');
        return {
          slot,
          confidence: Math.min(100, Number(mapped.confidence_weight || 98)),
          status: 'matched',
          matchedBy: 'provider_game_code',
          reasons,
        };
      }
    }
  }

  if (slotHintNorm) {
    const alias = aliases.find((row) => {
      const aliasNorm = normalizeText(row.alias_normalized || row.alias);
      return aliasNorm && aliasNorm === slotHintNorm
        && (!row.provider_name || !providerHint || providerMatches(row.provider_name, providerHint));
    });
    if (alias) {
      const slot = shapeSlot(alias.slot || slots.find((item) => item.id === alias.slot_id));
      if (slot) {
        reasons.push('slot_alias');
        if (providerHint && providerMatches(slot.provider, providerHint)) reasons.push('provider_match');
        return {
          slot,
          confidence: Math.min(100, Number(alias.confidence_weight || 94)),
          status: 'matched',
          matchedBy: 'slot_alias',
          reasons,
        };
      }
    }
  }

  let best = null;
  for (const row of slots) {
    const slot = shapeSlot(row);
    const nameNorm = normalizeText(slot.name);
    if (!nameNorm || !slotHintNorm) continue;
    let score = 0;
    if (nameNorm === slotHintNorm) score = 92;
    else if (nameNorm.includes(slotHintNorm) || slotHintNorm.includes(nameNorm)) score = 86;
    else {
      const similarity = diceCoefficient(nameNorm, slotHintNorm);
      if (similarity >= 0.9) score = 84;
      else if (similarity >= 0.82) score = 76;
      else if (similarity >= 0.72) score = 62;
    }
    const hasProviderMatch = providerHint && providerMatches(slot.provider, providerHint);
    if (score && hasProviderMatch) score = Math.min(100, score + 10);
    if (score && (!best || score > best.confidence)) {
      best = {
        slot,
        confidence: score,
        matchedBy: score >= 86 ? 'slot_name' : 'fuzzy_slot_name',
        reasons: [score >= 86 ? 'slot_name' : 'fuzzy_slot_name', ...(hasProviderMatch ? ['provider_match'] : [])],
      };
    }
  }

  if (best) {
    return {
      ...best,
      status: confidenceStatus(best.confidence, best.slot),
    };
  }

  if (evidence.crossOriginUnsupported) {
    return {
      slot: null,
      confidence: 10,
      status: 'unsupported',
      matchedBy: 'unsupported_iframe',
      reasons: ['cross_origin_iframe_not_accessible'],
    };
  }

  return {
    slot: null,
    confidence: 0,
    status: 'unmatched',
    matchedBy: 'none',
    reasons,
  };
}
