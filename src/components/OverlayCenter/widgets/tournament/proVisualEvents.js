import { calcMatchWinner, calcRoundWinner } from "./tournamentEngine";

export const PRO_CINEMATIC_DEFAULTS = Object.freeze({
  animationPreset: "subtle",
  cinematicEnabled: true,
  cinematicIntensity: 100,
  enablePayoutCounter: true,
  enableWinnerEffects: true,
  enableChampionReveal: true,
  enableRoundTransitions: true,
});

export function normalizeProCinematicSettings(config = {}) {
  const preset = ["none", "subtle", "cinematic"].includes(config.animationPreset)
    ? config.animationPreset : PRO_CINEMATIC_DEFAULTS.animationPreset;
  return {
    preset,
    enabled: config.cinematicEnabled !== false,
    intensity: Math.min(100, Math.max(0, Number(config.cinematicIntensity ?? 100) || 0)),
    payoutCounter: config.enablePayoutCounter !== false,
    winnerEffects: config.enableWinnerEffects !== false,
    championReveal: config.enableChampionReveal !== false,
    roundTransitions: config.enableRoundTransitions !== false,
  };
}

const confirmedPayout = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const scoreThrough = (rounds, lastIndex) => rounds.slice(0, lastIndex + 1).reduce((score, round) => {
  if (round.winner === "player1") score.player1 += 1;
  if (round.winner === "player2") score.player2 += 1;
  return score;
}, { player1: 0, player2: 0 });

export function snapshotProMatches(matches = [], tournamentId = "") {
  return matches.filter(Boolean).map((match, matchIndex) => {
    const id = String(match.id || match.createdAt || `legacy:${matchIndex}:${match.player1}:${match.player2}`);
    const rounds = (match.rounds || []).map((round, index) => ({
      id: String(round.id || round.roundNum || index + 1),
      revision: Number(round.revision) || 0,
      payout1: confirmedPayout(round.player1?.bonusPayout),
      payout2: confirmedPayout(round.player2?.bonusPayout),
      winner: calcRoundWinner(round, match.type),
    }));
    return {
      tournamentId: String(tournamentId || matches[0]?.id || "legacy"),
      id,
      revision: Number(match.revision) || 0,
      status: match.status || "pending",
      winner: match.winner || calcMatchWinner(match),
      rounds,
    };
  });
}

function visualKey(tournamentId, matchId, roundId, type, revision) {
  return JSON.stringify([tournamentId, matchId, roundId, type, revision]);
}

export function diffProVisualEvents(before = [], after = []) {
  const previous = new Map(before.map((match) => [match.id, match]));
  const current = new Map(after.map((match) => [match.id, match]));
  let reset = before.some((match) => !current.has(match.id) || current.get(match.id).tournamentId !== match.tournamentId);
  const events = [];

  for (const match of after) {
    const old = previous.get(match.id);
    if (!old) {
      if (match.status === "in_progress" && before.length) {
        events.push({ type: "intro", matchId: match.id, key: visualKey(match.tournamentId, match.id, "match", "intro", "start") });
      }
      continue;
    }
    if (old.status !== "pending" && match.status === "pending") reset = true;
    if (old.status === "pending" && match.status === "in_progress") {
      events.push({ type: "intro", matchId: match.id, key: visualKey(match.tournamentId, match.id, "match", "intro", "start") });
    }

    let resultChanged = false;
    match.rounds.forEach((round, index) => {
      const previousRound = old.rounds[index];
      if (!previousRound) return;
      if (previousRound.winner !== null && round.winner === null) reset = true;
      const payouts = [];
      if (round.payout1 !== null && round.payout1 !== previousRound.payout1)
        payouts.push({ side: "left", from: previousRound.payout1, value: round.payout1 });
      if (round.payout2 !== null && round.payout2 !== previousRound.payout2)
        payouts.push({ side: "right", from: previousRound.payout2, value: round.payout2 });
      const winnerChanged = round.winner !== null && round.winner !== previousRound.winner;
      if (winnerChanged) {
        resultChanged = true;
        events.push({
          type: "result", matchId: match.id, roundIndex: index, roundId: round.id,
          winner: round.winner, payouts,
          fromScore: scoreThrough(old.rounds, index), toScore: scoreThrough(match.rounds, index),
          champion: old.winner !== match.winner && match.winner !== "draw" ? match.winner : null,
          key: visualKey(match.tournamentId, match.id, round.id, "result", [round.revision, round.winner, round.payout1, round.payout2]),
        });
      } else if (payouts.length) {
        events.push({
          type: "payout", matchId: match.id, roundIndex: index, roundId: round.id, payouts,
          key: visualKey(match.tournamentId, match.id, round.id, "payout", [round.revision, round.payout1, round.payout2]),
        });
      }
    });
    if (!resultChanged && old.winner !== match.winner && match.winner && match.winner !== "draw") {
      events.push({
        type: "champion", matchId: match.id, champion: match.winner,
        key: visualKey(match.tournamentId, match.id, "match", "champion", [match.revision, match.winner]),
      });
    }
  }
  return { events: reset ? [] : events, reset };
}

export function createProProcessedRegistry(storage, key = "sc:pro-tournament-visuals:v1", limit = 128) {
  let entries = [];
  try {
    const stored = JSON.parse(storage?.getItem(key) || "[]");
    if (Array.isArray(stored)) entries = stored.filter((entry) => typeof entry === "string").slice(-limit);
  } catch { /* Storage can be blocked in OBS; the in-memory registry still works. */ }
  const seen = new Set(entries);
  return {
    has: (eventKey) => seen.has(eventKey),
    add(eventKey) {
      if (seen.has(eventKey)) return;
      seen.add(eventKey);
      entries.push(eventKey);
      while (entries.length > limit) seen.delete(entries.shift());
      try { storage?.setItem(key, JSON.stringify(entries)); } catch { /* Keep in-memory deduplication. */ }
    },
    clear() {
      entries = [];
      seen.clear();
      try { storage?.removeItem(key); } catch { /* Keep the controller usable. */ }
    },
  };
}
