import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const executable = process.env.SLOT_CAPTURE_AGENT_EXE;
const dotnet = executable || process.env.SLOT_CAPTURE_DOTNET || 'dotnet';
const dll = process.env.SLOT_CAPTURE_AGENT_DLL || path.resolve('native/slot-capture-agent/bin/Release/net8.0-windows10.0.19041.0/win-x64/StreamersCenterSlotCaptureSetup.dll');
if (!executable) assert.equal(fs.existsSync(dll), true, `Build the agent first: missing ${dll}`);

const child = spawn(dotnet, executable ? ['--native-host'] : [dll, '--native-host'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
let buffered = Buffer.alloc(0);
const messages = [];
const errors = [];
child.stderr.on('data', (chunk) => errors.push(String(chunk)));
child.stdout.on('data', (chunk) => {
  buffered = Buffer.concat([buffered, chunk]);
  while (buffered.length >= 4) {
    const length = buffered.readUInt32LE(0);
    if (buffered.length < 4 + length) break;
    messages.push(JSON.parse(buffered.subarray(4, 4 + length).toString('utf8')));
    buffered = buffered.subarray(4 + length);
  }
});

function send(value) {
  const payload = Buffer.from(JSON.stringify(value));
  const length = Buffer.alloc(4);
  length.writeUInt32LE(payload.length);
  child.stdin.write(Buffer.concat([length, payload]));
}

async function waitFor(predicate, timeout = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const match = messages.find(predicate);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Agent response timeout. stderr=${errors.join('')}`);
}

try {
  const hello = await waitFor((message) => message.type === 'agent:hello');
  assert.equal(hello.version, '0.1.0');
  assert.equal(hello.status.connected, true);
  assert.match(hello.status.obsBaseUrl, /^http:\/\/127\.0\.0\.1:19384\/obs$/);
  assert.match(hello.status.sessionToken, /^[a-f0-9]{48}$/);
  send({ type: 'extension:hello', version: 'test' });
  const status = await waitFor((message) => message.type === 'agent:status');
  assert.equal(status.status.transport, 'loopback_websocket');
  assert.equal(status.status.nativeBackend, 'gdi_visible_window');

  const forbidden = await fetch(`${hello.status.obsBaseUrl}/profile-test?token=wrong`);
  assert.equal(forbidden.status, 403);
  const player = await fetch(`${hello.status.obsBaseUrl}/profile-test?token=${hello.status.sessionToken}`);
  assert.equal(player.status, 200);
  assert.match(await player.text(), /new WebSocket/);
  console.log('Slot Capture native host protocol tests passed');
} finally {
  child.kill();
}
