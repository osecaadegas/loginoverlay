/**
 * bracketUtils.js — Tournament bracket helpers used by TournamentConfig overlay widget.
 *
 * All functions are pure/immutable — they return new objects and never mutate input.
 *
 * Bracket data shape (returned by generateBracket and stored in config.bracketData):
 *   Array<{ label: string, round: number, matches: Match[] }>
 * where each Match is a full tournament-engine match object (createMatch result).
 */

import {
  createMatch,
  updateRoundData,
  MATCH_STATUS,
} from '../OverlayCenter/widgets/tournament/tournamentEngine';

/* ─── Round label by match count ─── */
const ROUND_LABELS = {
  1: 'Final',
  2: 'Semi-Finals',
  4: 'Quarter-Finals',
  8: 'Round of 16',
  16: 'Round of 32',
};
function getRoundLabel(matchCount) {
  return ROUND_LABELS[matchCount] || `Round of ${matchCount * 2}`;
}

/* ─── Internal deep-clone of bracket ─── */
function cloneBracket(bracketData) {
  return bracketData.map(r => ({
    ...r,
    matches: r.matches.map(m => ({
      ...m,
      rounds: m.rounds.map(rd => ({
        ...rd,
        player1: { ...rd.player1 },
        player2: { ...rd.player2 },
      })),
    })),
  }));
}

/**
 * Return the seeded players array unchanged.
 * Extend here for real seeding logic (e.g. random shuffle).
 */
export function seedPlayers(players = []) {
  return [...players];
}

/**
 * Generate a full single-elimination bracket from a seeded players array.
 *
 * @param {Array}  seededPlayers  Player objects: { id, name, slot: { name, image } }
 * @param {string} bracketType   'bonus' | 'bonus_bo3' | 'bonus_bo3_classic' | 'spins'
 * @param {object} cfg           Type-specific config (e.g. { numSpins: 50 })
 * @returns {Array<{ label: string, round: number, matches: Match[] }>}
 */
export function generateBracket(seededPlayers = [], bracketType = 'bonus', cfg = {}) {
  if (seededPlayers.length < 2) return [];

  const rounds = [];

  // Round 1 — real players
  const round1Matches = [];
  for (let i = 0; i < Math.floor(seededPlayers.length / 2); i++) {
    const p1 = seededPlayers[i * 2];
    const p2 = seededPlayers[i * 2 + 1];
    round1Matches.push(
      createMatch({
        player1: p1?.name || 'TBD',
        player2: p2?.name || 'TBD',
        slot1: p1?.slot || { name: '', image: null },
        slot2: p2?.slot || { name: '', image: null },
        type: bracketType,
        config: cfg,
      })
    );
  }
  rounds.push({ label: getRoundLabel(round1Matches.length), round: 0, matches: round1Matches });

  // Subsequent rounds — TBD placeholder matches
  let prevCount = round1Matches.length;
  let roundNum = 1;
  while (prevCount > 1) {
    const nextCount = Math.floor(prevCount / 2);
    const nextMatches = [];
    for (let i = 0; i < nextCount; i++) {
      nextMatches.push(
        createMatch({
          player1: 'TBD',
          player2: 'TBD',
          slot1: { name: '', image: null },
          slot2: { name: '', image: null },
          type: bracketType,
          config: cfg,
        })
      );
    }
    rounds.push({ label: getRoundLabel(nextCount), round: roundNum, matches: nextMatches });
    prevCount = nextCount;
    roundNum++;
  }

  return rounds;
}

/**
 * Update a single round's input data for one player inside a bracket match.
 * Recalculates round and match winners. If the match completes, propagates
 * the winner into the appropriate slot in the next bracket round.
 *
 * @param {Array}  bracketData   Full bracket (array of round objects)
 * @param {number} roundIdx      Index into bracketData
 * @param {number} matchIdx      Index into bracketData[roundIdx].matches
 * @param {number} roundInputIdx Index into match.rounds (0-based)
 * @param {string} playerKey     'player1' | 'player2'
 * @param {object} data          Partial round data to merge, e.g. { bonusPayout: 120 }
 * @param {Array}  _players      (unused, kept for API compatibility)
 * @returns {{ bracket: Array, matchCompleted: boolean }}
 */
export function updateBracketMatch(bracketData, roundIdx, matchIdx, roundInputIdx, playerKey, data, _players = []) {
  const match = bracketData[roundIdx]?.matches[matchIdx];
  if (!match) return { bracket: bracketData, matchCompleted: false };

  const wasCompleted = match.status === MATCH_STATUS.COMPLETED;

  // Use the engine's pure updater — returns a new match object
  const updatedMatch = updateRoundData(match, roundInputIdx, playerKey, data);

  // Build the new bracket with the updated match
  let newBracket = cloneBracket(bracketData);
  newBracket[roundIdx].matches[matchIdx] = updatedMatch;

  const matchCompleted = !wasCompleted && updatedMatch.status === MATCH_STATUS.COMPLETED;

  // Propagate winner to the next round if the match just completed
  if (matchCompleted && updatedMatch.winner && updatedMatch.winner !== 'draw') {
    newBracket = _propagateWinner(newBracket, roundIdx, matchIdx);
  }

  return { bracket: newBracket, matchCompleted };
}

/**
 * Manually propagate a match winner to the next round bracket slot.
 * Called by the manual override flow in TournamentConfig.
 *
 * @param {Array}  bracketData  Full bracket
 * @param {number} roundIdx     Round containing the completed match
 * @param {number} matchIdx     Match index within that round
 * @param {Array}  _players     (unused)
 * @returns {Array} New bracket data
 */
export function propagateWinner(bracketData, roundIdx, matchIdx, _players = []) {
  return _propagateWinner(bracketData, roundIdx, matchIdx);
}

/**
 * Internal: advance the winner of [roundIdx][matchIdx] into the correct
 * player slot of the next round's match.
 * - even matchIdx → fills player1 slot of next match
 * - odd  matchIdx → fills player2 slot of next match
 */
function _propagateWinner(bracketData, roundIdx, matchIdx) {
  const match = bracketData[roundIdx]?.matches[matchIdx];
  if (!match || !match.winner || match.winner === 'draw') return bracketData;

  const nextRoundIdx = roundIdx + 1;
  if (nextRoundIdx >= bracketData.length) return bracketData; // already the final

  const nextMatchIdx = Math.floor(matchIdx / 2);
  const fillPlayer1  = matchIdx % 2 === 0; // even → player1, odd → player2

  const winnerName = match.winner === 'player1' ? match.player1 : match.player2;
  const winnerSlot = match.winner === 'player1' ? match.slot1  : match.slot2;

  return bracketData.map((r, rIdx) => {
    if (rIdx !== nextRoundIdx) return r;
    return {
      ...r,
      matches: r.matches.map((m, mIdx) => {
        if (mIdx !== nextMatchIdx) return m;
        return fillPlayer1
          ? { ...m, player1: winnerName, slot1: winnerSlot }
          : { ...m, player2: winnerName, slot2: winnerSlot };
      }),
    };
  });
}

/**
 * Return summary stats for a bracket.
 * Counts all matches (including future TBD placeholder rounds).
 *
 * @returns {{ total: number, completed: number, remaining: number }}
 */
export function getBracketStats(bracketData = []) {
  let total = 0;
  let completed = 0;
  for (const round of bracketData) {
    for (const match of (round.matches || [])) {
      total++;
      if (match.status === MATCH_STATUS.COMPLETED || match.winner != null) {
        completed++;
      }
    }
  }
  return { total, completed, remaining: total - completed };
}

/**
 * Return the champion's display name from the final match, or null if undecided.
 *
 * @param {Array} bracketData  Full bracket
 * @returns {string|null}
 */
export function getChampion(bracketData = []) {
  if (!bracketData.length) return null;
  const lastRound = bracketData[bracketData.length - 1];
  if (!lastRound?.matches?.length) return null;
  const finalMatch = lastRound.matches[0];
  if (!finalMatch?.winner || finalMatch.winner === 'draw') return null;
  return finalMatch.winner === 'player1' ? finalMatch.player1 : finalMatch.player2;
}
