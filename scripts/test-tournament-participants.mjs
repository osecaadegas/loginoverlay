import assert from 'node:assert/strict';
import handler, { fetchTwitchProfiles, normalizeTwitchLogin } from '../api/tournament-participants.js';
import { generateBracket, propagateWinner } from '../src/components/TournamentsPage/bracketUtils.js';

assert.equal(normalizeTwitchLogin('https://www.twitch.tv/TurboSpin/'), 'turbospin');
assert.equal(normalizeTwitchLogin('@DiamondDan'), 'diamonddan');
assert.equal(normalizeTwitchLogin('Bad User Name'), '');

const requests = [];
const profiles = await fetchTwitchProfiles(['turbospin', 'diamonddan'], {
  clientId: 'test-client', clientSecret: 'test-secret',
  fetcher: async (url, options) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      json: async () => String(url).includes('oauth2/token')
        ? { access_token: 'test-token', expires_in: 3600 }
        : { data: [
          { login: 'turbospin', display_name: 'TurboSpin', profile_image_url: 'https://example.com/turbo.png' },
          { login: 'diamonddan', display_name: 'DiamondDan', profile_image_url: 'https://example.com/diamond.png' },
        ] },
    };
  },
});
assert.equal(requests.length, 2);
assert.match(requests[1].url, /login=turbospin.*login=diamonddan/);
assert.equal(profiles.turbospin.avatarUrl, 'https://example.com/turbo.png');

const players = [
  { name: 'TurboSpin', avatarUrl: profiles.turbospin.avatarUrl },
  { name: 'DiamondDan', avatarUrl: profiles.diamonddan.avatarUrl },
  { name: 'Third', avatarUrl: '' },
  { name: 'Fourth', avatarUrl: '' },
];
const bracket = generateBracket(players, 'bonus_bo3');
assert.equal(bracket[0].matches[0].player1Avatar, 'https://example.com/turbo.png');
assert.equal(bracket[0].matches[0].player2Avatar, 'https://example.com/diamond.png');
bracket[0].matches[0].winner = 'player1';
const advanced = propagateWinner(bracket, 0, 0);
assert.equal(advanced[1].matches[0].player1, 'TurboSpin');
assert.equal(advanced[1].matches[0].player1Avatar, 'https://example.com/turbo.png');

const response = () => ({
  statusCode: 200,
  setHeader() {},
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; },
});
const unauthorized = response();
await handler({ method: 'POST', headers: {}, body: { logins: ['turbospin'] } }, unauthorized);
assert.equal(unauthorized.statusCode, 401);
const wrongMethod = response();
await handler({ method: 'GET', headers: {} }, wrongMethod);
assert.equal(wrongMethod.statusCode, 405);

console.log('Tournament profile lookup, bracket avatar propagation and method checks passed.');
