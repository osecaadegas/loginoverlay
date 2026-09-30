const DEFAULT_SPIN_SECONDS = 5.2;
const MIN_SPIN_SECONDS = 1.2;
const MAX_SPIN_SECONDS = 12;

/**
 * Giveaway configs historically used seconds while the appearance model uses
 * milliseconds. Normalize both without allowing a long-running reel.
 */
export function resolveGiveawaySpinDurationSeconds(config = {}) {
  const raw = Number(config.durationSec ?? config.duration);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SPIN_SECONDS;
  const seconds = raw > 20 ? raw / 1000 : raw;
  return Math.min(MAX_SPIN_SECONDS, Math.max(MIN_SPIN_SECONDS, seconds));
}

export function resolveGiveawayRevealDelayMs(config = {}) {
  return Math.round(resolveGiveawaySpinDurationSeconds(config) * 1000 + 320);
}
