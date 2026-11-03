import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { connectStreamElementsActivityAlerts, isOverlayActivityToken, parseStreamElementsActivity } from '../src/components/OverlayCenter/widgets/chat/streamElementsActivityAlerts.js';

assert.equal(isOverlayActivityToken('a'.repeat(32)), true);
assert.equal(isOverlayActivityToken('eyJhbGci.eyJzdWI.signature'), false, 'account JWTs must not reach browser sources');

const activity = (id, type, data) => ({ id, type: 'message', topic: 'channel.activities', data: { activityId: id, type, data } });
assert.deepEqual(parseStreamElementsActivity(activity('follow-1', 'follow', { displayName: 'Viewer' })), {
  id: 'follow-1', kind: 'follow', username: 'Viewer', amount: null, currency: '',
});
assert.deepEqual(parseStreamElementsActivity(activity('tip-1', 'tip', { displayName: 'Donor', amount: 4.2, currency: 'EUR' })), {
  id: 'tip-1', kind: 'tip', username: 'Donor', amount: 4.2, currency: 'EUR',
});
assert.equal(parseStreamElementsActivity(activity('sub-1', 'subscriber', { username: 'Viewer' })), null);
assert.equal(parseStreamElementsActivity({ ...activity('tip-pending', 'tip', { username: 'Donor', amount: 5 }), data: { ...activity('tip-pending', 'tip', {}).data, approved: 'pending' } }), null);
assert.equal(parseStreamElementsActivity({ type: 'message', topic: 'channel.chat', data: {} }), null);

class TestSocket {
  static instances = [];
  constructor(url) { this.url = url; this.sent = []; this.closed = false; TestSocket.instances.push(this); }
  send(value) { this.sent.push(JSON.parse(value)); }
  close() { this.closed = true; }
  receive(value) { this.onmessage?.({ data: JSON.stringify(value) }); }
}
const alerts = [];
const disconnect = connectStreamElementsActivityAlerts({ token: 'a'.repeat(32), onAlert: (alert) => alerts.push(alert), WebSocketClass: TestSocket });
const socket = TestSocket.instances[0];
assert.equal(socket.url, 'wss://astro.streamelements.com/');
socket.receive({ type: 'welcome' });
assert.equal(socket.sent.length, 1);
assert.deepEqual(socket.sent[0].data, { topic: 'channel.activities', token: 'a'.repeat(32), token_type: 'apikey' });
socket.receive(activity('follow-1', 'follow', { username: 'Viewer' }));
socket.receive(activity('follow-1', 'follow', { username: 'Viewer' }));
socket.receive(activity('tip-1', 'tip', { username: 'Donor', amount: 5 }));
socket.receive({ type: 'message', topic: 'channel.activities', data: { type: 'follow', data: { username: 'No ID' } } });
assert.deepEqual(alerts.map((alert) => alert.kind), ['follow', 'tip']);
disconnect();
assert.equal(socket.closed, true);

const chatSource = readFileSync(new URL('../src/components/OverlayCenter/widgets/chat/ChatWidget.jsx', import.meta.url), 'utf8');
const controlsSource = readFileSync(new URL('../src/components/OverlayCenter/editor/BetterWidgetPackages.jsx', import.meta.url), 'utf8');
assert.match(chatSource, /className={`ov-chat-activity-alert/);
assert.match(controlsSource, /Follower and Tip Alerts/);
console.log('Chat activity alert parser, subscription and editor controls passed.');
