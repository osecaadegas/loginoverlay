/**
 * Unified Tournament Engine
 * ─────────────────────────
 * Shared logic for all tournament types:
 *   1. spins       — N-spin balance comparison
 *   2. bonus       — single bonus buy net-profit comparison
 *   3. bonus_bo3   — best-of-3 bonus buy (first to 2 round wins)
 *
 * The engine is config-driven: only the rule configuration changes.
 * All calculations are pure functions (no side effects).
 */

/* ════════════════════════════════════════════════════════
   TYPE DEFINITIONS (for reference — not enforced at runtime)
   ════════════════════════════════════════════════════════

   Match {
     id:        string,          unique match id
     player1:   string,          player A name
     player2:   string,          player B name
     slot1:   { name, image },   slot for player 1
     type:      'spins' | 'bonus' | 'bonus_bo3',
     status:    'pending' | 'in_progress' | 'completed',
     winner:    null | 'player1' | 'player2' | 'draw',
     rounds:    Round[],         per-round data (1 for spins/bonus, 3 for bo3)
     config:    MatchConfig,     type-specific settings
     createdAt: ISO string,
   }

   Round {
     roundNum: number,           1-based
     player1:  RoundData,
     player2:  RoundData,
     winner:   null | 'player1' | 'player2' | 'draw',
     status:   'pending' | 'completed',
   }

   RoundData (varies by type):
     spins:     { startBalance, endBalance }
     bonus:     { bonusCost, bonusPayout }
     bonus_bo3: { bonusCost, bonusPayout }

   MatchConfig:
     spins:     { numSpins }
     bonus:     {}
     bonus_bo3: { drawRule: 'no_point' | 'replay' }
*/

/* ─── Constants ─── */
export const TOURNAMENT_TYPES = {
  spins: { id: 'spins', label: 'Spins Tournament', icon: '🎰', description: 'Compare profit after N spins' },
  bonus: { id: 'bonus', label: 'Bonus Tournament', icon: '🎯', description: 'Single bonus buy — highest net profit wins' },
  bonus_bo3: { id: 'bonus_bo3', label: 'Bonus Best of 3', icon: '🔥', description: 'Best of 3 bonus buys — first to 2 wins' },
  bonus_bo3_classic: { id: 'bonus_bo3_classic', label: 'Bo3 Classic', icon: '🏅', description: 'Best of 3 — highest total multiplier wins' },
};

export const MATCH_STATUS = { PENDING: 'pending', IN_PROGRESS: 'in_progress', COMPLETED: 'completed' };
export const ROUND_STATUS = { PENDING: 'pending', COMPLETED: 'completed' };

/* ─── ID generator ─── */
let _idCounter = 0;
export const genId = () => `m_${Date.now()}_${++_idCounter}`;

/* ════════════════════════════════════════════════════════
   CREATE MATCH
   ════════════════════════════════════════════════════════ */
export function createMatch({ player1, player2, slot1, slot2, type, config = {} }) {
  const roundCount = (type === 'bonus_bo3' || type === 'bonus_bo3_classic') ? 3 : 1;
  const rounds = Array.from({ length: roundCount }, (_, i) => createEmptyRound(i + 1, type));

  return {
    id: genId(),
    player1,
    player2,
    slot1: slot1 || { name: '', image: null },
    slot2: slot2 || { name: '', image: null },
    type,
    status: MATCH_STATUS.PENDING,
    winner: null,
    rounds,
    config: { ...getDefaultConfig(type), ...config },
    createdAt: new Date().toISOString(),
  };
}

function createEmptyRound(roundNum, type) {
  const emptyData = type === 'spins'
    ? { startBalance: null, endBalance: null }
    : { bonusCost: null, bonusPayout: null };

  return {
    roundNum,
    player1: { ...emptyData },
    player2: { ...emptyData },
    winner: null,
    status: ROUND_STATUS.PENDING,
  };
}

function getDefaultConfig(type) {
  switch (type) {
    case 'spins': return { numSpins: 50 };
    case 'bonus': return {};
    case 'bonus_bo3': return { drawRule: 'no_point' };
    case 'bonus_bo3_classic': return {};
    default: return {};
  }
}

/* ════════════════════════════════════════════════════════
   ROUND CALCULATIONS
   ════════════════════════════════════════════════════════ */

/**
 * Calculate the "result" value for one player in one round.
 * - spins:  profit = endBalance − startBalance
 * - bonus / bonus_bo3: netProfit = bonusPayout − bonusCost
 * Returns a number or null if data is incomplete.
 */
export function calcRoundResult(roundData, type) {
  if (!roundData) return null;
  if (type === 'spins') {
    const start = parseFloat(roundData.startBalance);
    const end = parseFloat(roundData.endBalance);
    if (isNaN(start) || isNaN(end)) return null;
    return end - start;
  }
  // bonus and bonus_bo3
  const cost = parseFloat(roundData.bonusCost);
  const payout = parseFloat(roundData.bonusPayout);
  if (isNaN(cost) || isNaN(payout)) return null;
  return payout - cost;
}

/**
 * Calculate the multiplier for one player in one round (payout / cost).
 * Used by bonus_bo3_classic to determine winner by sum of multipliers.
 */
export function calcRoundMultiplier(roundData) {
  if (!roundData) return null;
  const cost = parseFloat(roundData.bonusCost);
  const payout = parseFloat(roundData.bonusPayout);
  if (isNaN(cost) || isNaN(payout) || cost <= 0) return null;
  return payout / cost;
}

/**
 * Determine the winner of a single round.
 * Compares the result values; higher wins. Equal → draw.
 * Returns 'player1' | 'player2' | 'draw' | null (if incomplete)
 */
export function calcRoundWinner(round, type) {
  const r1 = calcRoundResult(round.player1, type);
  const r2 = calcRoundResult(round.player2, type);
  if (r1 === null || r2 === null) return null;
  if (r1 > r2) return 'player1';
  if (r2 > r1) return 'player2';
  return 'draw';
}

/* ════════════════════════════════════════════════════════
   MATCH CALCULATIONS
   ════════════════════════════════════════════════════════ */

/**
 * For spins & bonus (single round): winner = round winner.
 * For bonus_bo3: first to 2 round wins. Draws may or may not count.
 */
export function calcMatchWinner(match) {
  if (!match || !match.rounds) return null;

  if (match.type === 'spins' || match.type === 'bonus') {
    return calcRoundWinner(match.rounds[0], match.type);
  }

  // bonus_bo3_classic: sum of all 3 multipliers (payout/cost), highest total wins
  if (match.type === 'bonus_bo3_classic') {
    const allPlayed = match.rounds.every(r => calcRoundMultiplier(r.player1) !== null && calcRoundMultiplier(r.player2) !== null);
    if (!allPlayed) return null;
    let p1Total = 0, p2Total = 0;
    for (const round of match.rounds) {
      p1Total += calcRoundMultiplier(round.player1);
      p2Total += calcRoundMultiplier(round.player2);
    }
    if (p1Total > p2Total) return 'player1';
    if (p2Total > p1Total) return 'player2';
    return 'draw';
  }

  // bonus_bo3
  const drawRule = match.config?.drawRule || 'no_point';
  let p1Wins = 0, p2Wins = 0;

  for (const round of match.rounds) {
    const rw = calcRoundWinner(round, match.type);
    if (rw === null) break; // incomplete round → can't determine yet
    if (rw === 'player1') p1Wins++;
    else if (rw === 'player2') p2Wins++;
    // draw: no point awarded under 'no_point' rule

    // Early termination: first to 2
    if (p1Wins >= 2) return 'player1';
    if (p2Wins >= 2) return 'player2';
  }

  // All 3 rounds played?
  const allPlayed = match.rounds.every(r => calcRoundWinner(r, match.type) !== null);
  if (!allPlayed) return null;

  // After 3 rounds, if still tied → draw
  if (p1Wins > p2Wins) return 'player1';
  if (p2Wins > p1Wins) return 'player2';
  return 'draw';
}

/**
 * Get the score breakdown for bo3 matches.
 * Returns { p1Wins, p2Wins, draws, roundResults: [{winner, p1Result, p2Result}] }
 */
export function getBoScoreboard(match) {
  if (!match || (match.type !== 'bonus_bo3' && match.type !== 'bonus_bo3_classic')) return null;
  const isClassic = match.type === 'bonus_bo3_classic';
  let p1Wins = 0, p2Wins = 0, draws = 0;
  const roundResults = match.rounds.map(round => {
    const p1r = isClassic ? calcRoundMultiplier(round.player1) : calcRoundResult(round.player1, match.type);
    const p2r = isClassic ? calcRoundMultiplier(round.player2) : calcRoundResult(round.player2, match.type);
    let rw = null;
    if (p1r !== null && p2r !== null) {
      rw = p1r > p2r ? 'player1' : p2r > p1r ? 'player2' : 'draw';
    }
    if (rw === 'player1') p1Wins++;
    else if (rw === 'player2') p2Wins++;
    else if (rw === 'draw') draws++;
    return { winner: rw, p1Result: p1r, p2Result: p2r };
  });
  return { p1Wins, p2Wins, draws, roundResults };
}

/* ════════════════════════════════════════════════════════
   MATCH STATE UPDATES
   ════════════════════════════════════════════════════════ */

/**
 * Update round data for a player. Returns a new match object (immutable).
 * Automatically recalculates round winners and match winner.
 */
export function updateRoundData(match, roundIdx, playerKey, data) {
  const newRounds = match.rounds.map((r, i) => {
    if (i !== roundIdx) return r;
    const updated = { ...r, [playerKey]: { ...r[playerKey], ...data } };
    // Auto-calc round winner
    const rw = calcRoundWinner(updated, match.type);
    updated.winner = rw;
    updated.status = rw !== null ? ROUND_STATUS.COMPLETED : ROUND_STATUS.PENDING;
    return updated;
  });

  const newMatch = { ...match, rounds: newRounds };

  // Auto-calc match winner
  const mw = calcMatchWinner(newMatch);
  newMatch.winner = mw;
  newMatch.status = mw !== null ? MATCH_STATUS.COMPLETED : MATCH_STATUS.IN_PROGRESS;

  return newMatch;
}

/**
 * Manually set the match winner (admin override).
 */
export function setManualWinner(match, winner) {
  return {
    ...match,
    winner,
    status: winner ? MATCH_STATUS.COMPLETED : match.status,
  };
}

/**
 * Reset a match to pending state.
 */
export function resetMatch(match) {
  const roundCount = (match.type === 'bonus_bo3' || match.type === 'bonus_bo3_classic') ? 3 : 1;
  return {
    ...match,
    winner: null,
    status: MATCH_STATUS.PENDING,
    rounds: Array.from({ length: roundCount }, (_, i) => createEmptyRound(i + 1, match.type)),
  };
}

/* ════════════════════════════════════════════════════════
   TOURNAMENT STATE
   ════════════════════════════════════════════════════════ */

/**
 * Create a new tournament state blob.
 * This is what gets stored in config.data.
 */
export function createTournament({ matches = [], title = '', prize = '' }) {
  return {
    matches,
    currentMatchIdx: 0,
    title,
    prize,
    active: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Update a match inside the tournament state. Returns a new state.
 */
export function updateTournamentMatch(tournamentData, matchIdx, updatedMatch) {
  const newMatches = tournamentData.matches.map((m, i) => i === matchIdx ? updatedMatch : m);
  return { ...tournamentData, matches: newMatches };
}

/**
 * Get summary stats for a tournament.
 */
export function getTournamentStats(tournamentData) {
  if (!tournamentData?.matches) return { total: 0, completed: 0, pending: 0, inProgress: 0 };
  const matches = tournamentData.matches;
  return {
    total: matches.length,
    completed: matches.filter(m => m.status === MATCH_STATUS.COMPLETED).length,
    pending: matches.filter(m => m.status === MATCH_STATUS.PENDING).length,
    inProgress: matches.filter(m => m.status === MATCH_STATUS.IN_PROGRESS).length,
  };
}

/* ════════════════════════════════════════════════════════
   DISPLAY HELPERS
   ════════════════════════════════════════════════════════ */

/**
 * Format a result number with sign and currency.
 * e.g., +30.00€ or −5.00€
 */
export function formatResult(val, currency = '€', mode) {
  if (val === null || val === undefined) return '—';
  if (mode === 'multiplier') {
    return `${val.toFixed(2)}x`;
  }
  const sign = val > 0 ? '+' : val < 0 ? '' : '';
  return `${sign}${val.toFixed(2)}${currency}`;
}

/**
 * Get display-ready label for a tournament type.
 */
export function getTypeLabel(type) {
  return TOURNAMENT_TYPES[type]?.label || type;
}

/**
 * Get the round fields needed for admin input based on type.
 */
export function getRoundInputFields(type) {
  if (type === 'spins') {
    return [
      { key: 'startBalance', label: 'Start Balance', prefix: '€' },
      { key: 'endBalance', label: 'End Balance', prefix: '€' },
    ];
  }
  return [
    { key: 'bonusCost', label: 'Bonus Cost', prefix: '€' },
    { key: 'bonusPayout', label: 'Payout', prefix: '€' },
  ];
}
