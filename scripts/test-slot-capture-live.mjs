import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import puppeteer from 'puppeteer';

const executable = process.env.SLOT_CAPTURE_AGENT_EXE || path.resolve('native/slot-capture-agent/bin/Release/net8.0-windows10.0.19041.0/win-x64/publish/StreamersCenterSlotCaptureSetup.exe');
const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--window-size=900,700', '--window-position=40,40'] });
const page = (await browser.pages())[0];
await page.goto(`data:text/html,${encodeURIComponent('<!doctype html><title>SC capture live fixture</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#17324c}.game{position:absolute;inset:45px;background:linear-gradient(135deg,#06b6d4,#4f46e5 55%,#f59e0b);border:12px solid #fff}</style><div class="game"></div>')}`);
await page.bringToFront();
await new Promise((resolve) => setTimeout(resolve, 600));
const metrics = await page.evaluate(() => ({
  bounds: (() => { const rect = document.querySelector('.game').getBoundingClientRect(); return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }; })(),
  viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
  browserMetrics: { screenX, screenY, outerWidth, outerHeight, innerWidth, innerHeight },
}));

const child = spawn(executable, ['--native-host'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
let buffered = Buffer.alloc(0);
const messages = [];
const errors = [];
child.stderr.on('data', (chunk) => errors.push(String(chunk)));
child.stdout.on('data', (chunk) => {
  buffered = Buffer.concat([buffered, chunk]);
  while (buffered.length >= 4) {
    const length = buffered.readUInt32LE(0);
    if (buffered.length < length + 4) break;
    messages.push(JSON.parse(buffered.subarray(4, length + 4).toString('utf8')));
    buffered = buffered.subarray(length + 4);
  }
});
function send(value) { const payload = Buffer.from(JSON.stringify(value)); const length = Buffer.alloc(4); length.writeUInt32LE(payload.length); child.stdin.write(Buffer.concat([length, payload])); }
async function waitFor(predicate, timeout = 7000) { const started = Date.now(); while (Date.now() - started < timeout) { const match = messages.find(predicate); if (match) return match; await new Promise((resolve) => setTimeout(resolve, 30)); } throw new Error(`Timeout: ${errors.join('')}`); }

try {
  const hello = await waitFor((message) => message.type === 'agent:hello');
  const captureId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  send({ type: 'capture:register', selection: { captureId, candidateId: 'live-fixture', tabId: 1, type: 'container', fingerprint: 'live-fixture', pageTitle: 'SC capture live fixture', ...metrics } });
  await waitFor((message) => message.type === 'capture:registered');
  send({ type: 'dashboard:command', command: 'bind-profile', payload: { profileId, captureId, outputWidth: 320, outputHeight: 180, fps: 15 } });
  await waitFor((message) => message.type === 'capture:bound');
  const socketUrl = `${hello.status.obsBaseUrl.replace('/obs', '/frames')}/${profileId}?token=${hello.status.sessionToken}`.replace('http:', 'ws:');
  const frame = await new Promise((resolve, reject) => {
    const socket = new WebSocket(socketUrl);
    socket.binaryType = 'arraybuffer';
    const timer = setTimeout(() => { socket.close(); reject(new Error(`No captured frame. ${errors.join('')}`)); }, 7000);
    socket.onmessage = (event) => { clearTimeout(timer); const bytes = new Uint8Array(event.data); socket.close(); resolve(bytes); };
    socket.onerror = () => { clearTimeout(timer); reject(new Error('Frame WebSocket failed.')); };
  });
  assert.equal(frame.byteLength > 12, true);
  const header = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  assert.equal(header.getInt32(0, true) > 0, true);
  assert.equal(header.getInt32(4, true) > 0, true);
  const pixels = frame.subarray(12);
  const nonBlack = pixels.some((value, index) => index % 4 !== 3 && value > 18);
  assert.equal(nonBlack, true, 'Captured frame must contain visible browser pixels');
  console.log(`Slot Capture live window test passed (${header.getInt32(0, true)}x${header.getInt32(4, true)})`);
} finally {
  child.kill();
  await browser.close();
}
