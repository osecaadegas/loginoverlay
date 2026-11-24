import assert from 'node:assert/strict';
import { beginOAuthSignIn } from '../src/utils/loginOAuth.js';

let returnPath;
const started = await beginOAuthSignIn(async (path) => {
  returnPath = path;
  return { data: { url: 'https://id.twitch.tv/oauth2/authorize' }, error: null };
}, '/overlay-center', 'twitch', 50);
assert.equal(returnPath, '/overlay-center');
assert.ok(started.url, 'a valid OAuth redirect is retained');
await assert.rejects(beginOAuthSignIn(() => Promise.resolve({ data: null, error: new Error('Provider unavailable') }), '/', 'twitch', 50), /Provider unavailable/);
await assert.rejects(beginOAuthSignIn(() => Promise.resolve({ data: {}, error: null }), '/', 'twitch', 50), /could not start/);
await assert.rejects(beginOAuthSignIn(() => new Promise(() => {}), '/', 'twitch', 10), { name: 'TimeoutError' });
console.log('OAuth start handles valid redirects, provider errors, missing redirects and backend timeouts.');
