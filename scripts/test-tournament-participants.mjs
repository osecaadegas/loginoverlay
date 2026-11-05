import assert from 'node:assert/strict';
import { resolveTournamentPlayers, safeAvatarUrl } from '../src/services/tournamentParticipantService.js';
import { generateBracket, propagateWinner } from '../src/components/TournamentsPage/bracketUtils.js';

const players = resolveTournamentPlayers([
  { name: 'Player One', twitchUsername: '@TurboSpin', slot: { name: 'First slot' } },
  { name: 'DiamondDan', slot: { name: 'Second slot' } },
  { name: 'Guest player', slot: { name: 'Third slot' } },
  { name: 'Fourth', avatarUrl: 'https://example.com/saved.png', slot: { name: 'Fourth slot' } },
]);
assert.equal(players[0].name, 'TurboSpin');
assert.equal(players[0].avatarUrl, 'https://unavatar.io/twitch/turbospin');
assert.equal(players[1].avatarUrl, 'https://unavatar.io/twitch/diamonddan');
assert.equal(players[2].name, 'Guest player');
assert.equal(players[2].avatarUrl, '');
assert.equal(players[3].avatarUrl, 'https://example.com/saved.png');
assert.equal(safeAvatarUrl('javascript:alert(1)'), '');
assert.equal(safeAvatarUrl('/images/participant.png'), '/images/participant.png');

const bracket = generateBracket(players, 'bonus_bo3');
assert.equal(bracket[0].matches[0].player1Avatar, players[0].avatarUrl);
assert.equal(bracket[0].matches[0].player2Avatar, players[1].avatarUrl);
bracket[0].matches[0].winner = 'player1';
const advanced = propagateWinner(bracket, 0, 0);
assert.equal(advanced[1].matches[0].player1, 'TurboSpin');
assert.equal(advanced[1].matches[0].player1Avatar, players[0].avatarUrl);

console.log('Tournament chat-avatar source, safe fallbacks and bracket propagation passed.');
