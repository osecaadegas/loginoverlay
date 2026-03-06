/**
 * Bracket Utilities
 * ─────────────────
 * Manages bracket tree structure for single-elimination tournaments.
 * Supports 4, 8, and 16 player brackets.
 * Works with the existing tournament engine's match/round system.
 */
import {
  createMatch,
  calcMatchWinner,
  updateRoundData,
  setManualWinner,
  resetMatch,
  MATCH_STATUS,
} from '../OverlayCenter/widgets/tournament/tournamentEngine';

/* ─── Round labels by player count ─── */
const ROUND_LABELS = {
  4: ['Semi Finals', 'Final'],
  8: ['Quarter Finals', 'Semi Finals', 'Final'],
  16: ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'],
};

/**
 * Generate an empty bracket structure for N players.
 * Returns an array of bracket rounds, each containing match slots.
 */
export function generateBracket(players, type, config = {}) {
  const count = players.length;
  const labels = ROUND_LABELS[count];
  if (!labels) throw new Error(`Unsupported player count: ${count}`);

  const rounds = [];
  let matchesInRound = count / 2;

  for (let r = 0; r < labels.length; r++) {
    const matches = [];
    for (let m = 0; m < matchesInRound; m++) {
      if (r === 0) {
        // First round — seed players
        const p1 = players[m * 2];
        const p2 = players[m * 2 + 1];
        matches.push(createMatch({
          player1: p1.name,
          player2: p2.name,
          slot1: p1.slot || { name: '', image: null },
          slot2: p2.slot || { name: '', image: null },
          type,
          config,
        }));
      } else {
        // Later rounds — TBD placeholders
        matches.push(createMatch({
          player1: 'TBD',
          player2: 'TBD',
          slot1: { name: '', image: null },
          slot2: { name: '', image: null },
          type,
          config,
        }));
      }
    }
    rounds.push({ round: r + 1, label: labels[r], matches });
    matchesInRound = matchesInRound / 2;
  }

  return rounds;
}

/**
 * After a match completes, propagate the winner to the next round.
 * Returns a new bracket array (immutable).
 */
export function propagateWinner(bracket, roundIdx, matchIdx, players) {
  const newBracket = bracket.map(r => ({
    ...r,
    matches: r.matches.map(m => ({ ...m })),
  }));

  const match = newBracket[roundIdx].matches[matchIdx];
  const winner = match.winner ?? calcMatchWinner(match);
  if (!winner || roundIdx >= newBracket.length - 1) return newBracket;

  // Determine destination: match index in next round and which player slot
  const nextMatchIdx = Math.floor(matchIdx / 2);
  const isPlayer1Slot = matchIdx % 2 === 0;
  const nextMatch = newBracket[roundIdx + 1].matches[nextMatchIdx];

  // Get winner's full info
  const winnerName = winner === 'player1' ? match.player1 : match.player2;
  const winnerSlot = winner === 'player1' ? match.slot1 : match.slot2;

  // Find player data from original players array
  const winnerPlayer = players.find(p => p.name === winnerName);
  const slot = winnerPlayer?.slot || winnerSlot || { name: '', image: null };

  if (isPlayer1Slot) {
    nextMatch.player1 = winnerName;
    nextMatch.slot1 = slot;
  } else {
    nextMatch.player2 = winnerName;
    nextMatch.slot2 = slot;
  }

  return newBracket;
}

/**
 * Update a match in the bracket with new round data.
 * Auto-propagates winner if match completes.
 * Returns { bracket, matchCompleted }.
 */
export function updateBracketMatch(bracket, roundIdx, matchIdx, roundDataIdx, playerKey, data, players) {
  let newBracket = bracket.map(r => ({
    ...r,
    matches: r.matches.map(m => ({ ...m, rounds: m.rounds.map(rd => ({ ...rd })) })),
  }));

  const match = newBracket[roundIdx].matches[matchIdx];
  const updated = updateRoundData(match, roundDataIdx, playerKey, data);
  newBracket[roundIdx].matches[matchIdx] = updated;

  const matchCompleted = updated.status === MATCH_STATUS.COMPLETED;
  if (matchCompleted) {
    newBracket = propagateWinner(newBracket, roundIdx, matchIdx, players);
  }

  return { bracket: newBracket, matchCompleted };
}

/**
 * Get tournament progress stats from bracket.
 */
export function getBracketStats(bracket) {
  let total = 0, completed = 0, inProgress = 0, pending = 0;
  for (const round of bracket) {
    for (const match of round.matches) {
      total++;
      if (match.status === MATCH_STATUS.COMPLETED) completed++;
      else if (match.status === MATCH_STATUS.IN_PROGRESS) inProgress++;
      else pending++;
    }
  }
  return { total, completed, inProgress, pending };
}

/**
 * Get the tournament champion (winner of the final match).
 */
export function getChampion(bracket) {
  if (!bracket.length) return null;
  const finalRound = bracket[bracket.length - 1];
  const finalMatch = finalRound.matches[0];
  if (!finalMatch || finalMatch.status !== MATCH_STATUS.COMPLETED) return null;
  const winner = finalMatch.winner ?? calcMatchWinner(finalMatch);
  if (!winner) return null;
  return winner === 'player1' ? finalMatch.player1 : finalMatch.player2;
}

/**
 * Build a seeded player order (standard bracket seeding).
 * For simplicity, we use the order provided (1 vs 2, 3 vs 4, etc.).
 */
export function seedPlayers(players) {
  return [...players];
}
