import assert from 'node:assert/strict';
import {
  ANALYTICS_EVENTS,
  getAnalyticsPeriodRange,
  getExperienceFromPath,
  getLegacyEventType,
  isKnownAnalyticsEvent,
  normalizeAnalyticsEventName,
  safeRatio,
} from '../shared/analytics.js';

assert.equal(normalizeAnalyticsEventName('pageview'), ANALYTICS_EVENTS.PAGE_VIEW);
assert.equal(normalizeAnalyticsEventName('offer_click'), ANALYTICS_EVENTS.OFFER_CLICKED);
assert.equal(normalizeAnalyticsEventName('Audience Player Selected'), ANALYTICS_EVENTS.AUDIENCE_PLAYER_SELECTED);
assert.equal(getLegacyEventType(ANALYTICS_EVENTS.OFFER_CLICKED), 'offer_click');
assert.equal(getLegacyEventType(ANALYTICS_EVENTS.PAGE_VIEW), 'pageview');
assert.equal(isKnownAnalyticsEvent(ANALYTICS_EVENTS.PLAYER_HUNT_CREATED), true);
assert.equal(isKnownAnalyticsEvent('made_up_event'), false);

assert.equal(getExperienceFromPath('/player/bonus-hunt'), 'player');
assert.equal(getExperienceFromPath('/overlay-center'), 'overlay');
assert.equal(getExperienceFromPath('/offers'), 'streamer');
assert.equal(getExperienceFromPath('/analytics'), 'admin');
assert.equal(getExperienceFromPath('/'), 'public');

const range = getAnalyticsPeriodRange('7d', new Date('2026-07-10T12:00:00.000Z'));
assert.equal(range.key, '7d');
assert.equal(range.days, 7);
assert.equal(range.end, '2026-07-10T12:00:00.000Z');
assert.equal(range.start, '2026-07-03T12:00:00.000Z');
assert.equal(range.previousStart, '2026-06-26T12:00:00.000Z');

assert.equal(safeRatio(50, 200), 25);
assert.equal(safeRatio(1, 3, 2), 33.33);
assert.equal(safeRatio(1, 0), 0);

console.log('Analytics tests passed');
