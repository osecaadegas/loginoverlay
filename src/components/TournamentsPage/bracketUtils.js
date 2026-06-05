/**
 * bracketUtils.js — Tournament bracket helpers used by TournamentConfig overlay widget.
 */

/**
 * Seed players into a single-elimination bracket.
 * Returns an array of match objects for round 1.
 */
export function seedPlayers(players = []) {
  const count = players.length;
  if (count < 2) return [];
  const matches = [];
  for (let i = 0; i < Math.floor(count / 2); i++) {
    matches.push({
      id: `m-${i}`,
      round: 1,
      player1: players[i * 2] || null,
      player2: players[i * 2 + 1] || null,
      winner: null,
    });
  }
  return matches;
}

/**
 * Propagate a winner through the bracket matches array (immutable).
 */
export function propagateWinner(matches = [], matchId, winner) {
  return matches.map(m => m.id === matchId ? { ...m, winner } : m);
}

/**
 * Return basic stats about the current bracket state.
 */
export function getBracketStats(matches = []) {
  const total     = matches.length;
  const completed = matches.filter(m => m.winner).length;
  const remaining = total - completed;
  return { total, completed, remaining };
}

/**
 * Return the champion (winner of the last match), or null if undecided.
 */
export function getChampion(matches = []) {
  if (!matches.length) return null;
  const last = matches[matches.length - 1];
  return last?.winner || null;
}
