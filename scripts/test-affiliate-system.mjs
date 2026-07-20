import assert from 'node:assert/strict';
import {
  buildRedirectDestination,
  escapeCsvFormula,
  isSuspectedBotRequest,
  parseCsv,
  rowsToObjects,
  sanitizeCampaign,
  sanitizeSource,
  validateDestinationUrl,
  validateShortCode,
} from '../api/_lib/affiliate.js';

function testDestinationValidation() {
  assert.equal(validateDestinationUrl('https://partner.example/path').ok, true);
  assert.equal(validateDestinationUrl('http://partner.example/path').ok, true);
  assert.equal(validateDestinationUrl('javascript:alert(1)').ok, false);
  assert.equal(validateDestinationUrl('https://example.com/\nLocation: https://bad.test').ok, false);
}

function testRedirectParameters() {
  const destination = buildRedirectDestination('https://brand.example/deal?existing=1', {
    source: 'twitch',
    campaign: 'summer-open',
    clickId: 'click-123',
    parameterMapping: {
      source_parameter: 'utm_source',
      campaign_parameter: 'utm_campaign',
      click_id_parameter: 'click_id',
    },
  });
  const url = new URL(destination);
  assert.equal(url.searchParams.get('existing'), '1');
  assert.equal(url.searchParams.get('utm_source'), 'twitch');
  assert.equal(url.searchParams.get('utm_campaign'), 'summer-open');
  assert.equal(url.searchParams.get('click_id'), 'click-123');
}

function testShortCodes() {
  assert.equal(validateShortCode('abc_123').ok, true);
  assert.equal(validateShortCode('go').ok, false);
  assert.equal(validateShortCode('admin').ok, false);
  assert.equal(validateShortCode('-bad').ok, false);
}

function testSanitizers() {
  assert.equal(sanitizeSource('Twitch'), 'twitch');
  assert.equal(sanitizeSource('unknown-network'), 'other');
  assert.equal(sanitizeCampaign('Launch <> Sale!!!'), 'Launch  Sale');
}

function testCsvSafety() {
  assert.equal(escapeCsvFormula('=cmd|bad'), "'=cmd|bad");
  const rows = rowsToObjects(parseCsv('email,registrations,notes\n"user@example.com",2,"hello, world"\n'));
  assert.equal(rows[0].data.email, 'user@example.com');
  assert.equal(rows[0].data.registrations, '2');
  assert.equal(rows[0].data.notes, 'hello, world');
}

function testBotDetection() {
  assert.equal(isSuspectedBotRequest({ headers: { 'user-agent': 'Discordbot/2.0' } }), true);
  assert.equal(isSuspectedBotRequest({ headers: { 'user-agent': 'Mozilla/5.0 Safari/537.36', accept: 'text/html' } }), false);
}

testDestinationValidation();
testRedirectParameters();
testShortCodes();
testSanitizers();
testCsvSafety();
testBotDetection();

console.log('Affiliate system tests passed.');
