import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root, 'browser-extension/manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.permissions.includes('nativeMessaging'), true);
assert.equal(manifest.content_scripts[0].all_frames, true);
assert.equal(manifest.content_scripts[0].matches.includes('https://streamerscenter.com/*'), true);

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
  await page.setContent(`<!doctype html><style>body{margin:0}.small{width:100px;height:80px}.game{width:960px;height:540px;border:0}.hidden{display:none}</style><iframe class="game" title="Slot principal"></iframe><canvas class="small"></canvas><div class="game-container hidden"></div>`);
  await page.addScriptTag({ path: path.join(root, 'browser-extension/src/captureCandidates.js') });
  const candidates = await page.evaluate(() => globalThis.StreamersCenterCaptureCandidates.collectCandidates());
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].type, 'iframe');
  assert.equal(candidates[0].bounds.width, 960);
  assert.equal(candidates[0].bounds.height, 540);
  assert.equal(candidates[0].confidence >= 70, true);
  assert.equal(typeof candidates[0].fingerprint, 'string');
  assert.equal(Object.hasOwn(candidates[0], 'source'), false, 'Candidate metadata must not expose the iframe URL');
  await page.evaluate(() => {
    window.__captureMessages = [];
    window.chrome = {
      runtime: {
        getManifest: () => ({ version: 'test' }),
        sendMessage: (message) => { window.__captureMessages.push(message); return Promise.resolve({ ok: true }); },
        onMessage: { addListener: (listener) => { window.__captureListener = listener; } },
      },
    };
  });
  await page.addScriptTag({ path: path.join(root, 'browser-extension/src/content.js') });
  const collected = await page.evaluate(() => new Promise((resolve) => window.__captureListener({ type: 'slot-capture:collect' }, {}, resolve)));
  assert.equal(collected.ok, true);
  assert.equal(collected.candidates.length, 1);
  await page.evaluate(() => new Promise((resolve) => window.__captureListener({ type: 'slot-capture:start-selector' }, {}, resolve)));
  await page.mouse.move(300, 250);
  await page.mouse.click(300, 250);
  const selectedMessage = await page.evaluate(() => window.__captureMessages.find((message) => message.type === 'slot-capture:selected'));
  assert.equal(selectedMessage.payload.type, 'iframe');
} finally {
  await browser.close();
}

const modelSource = await fs.readFile(path.join(root, 'src/features/slotCapture/slotCaptureModel.js'), 'utf8');
const executableModel = modelSource.replaceAll('export const ', 'const ').replaceAll('export function ', 'function ')
  + '\nreturn { normalizeBounds, makeMask, makeFilter, QUALITY_PRESETS };';
const model = new Function(executableModel)();
assert.deepEqual(model.normalizeBounds({ x: 100, y: 50, width: 800, height: 450 }, { width: 1000, height: 500, devicePixelRatio: 2 }), {
  x: 0.1, y: 0.1, width: 0.8, height: 0.9, viewportWidth: 1000, viewportHeight: 500, devicePixelRatio: 2,
});
assert.equal(model.makeMask('ellipse').mask_type, 'ellipse');
assert.equal(model.makeFilter('contrast').filter_type, 'contrast');
assert.throws(() => model.makeMask('unsupported'), /não suportado/);

const migration = await fs.readFile(path.join(root, 'migrations/20261014093000_slot_capture_profiles.sql'), 'utf8');
for (const table of ['slot_capture_profiles', 'slot_capture_sources', 'slot_capture_masks', 'slot_capture_filters', 'slot_capture_outputs']) {
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
}
assert.match(migration, /page_domain text not null/);
assert.doesNotMatch(migration, /iframe_url|full_url|video_frame/i);

const background = await fs.readFile(path.join(root, 'browser-extension/src/background.js'), 'utf8');
assert.match(background, /connectNative\(NATIVE_HOST\)/);
assert.match(background, /capture:geometry/);
assert.match(background, /capture:tab-closed/);

const manager = await fs.readFile(path.join(root, 'src/features/slotCapture/SlotCaptureManager.jsx'), 'utf8');
assert.match(manager, /Nenhum vídeo é simulado ou enviado para a nuvem/);
assert.match(manager, /Selecionar slot no browser/);
assert.match(manager, /Saída OBS independente/);
assert.match(manager, /streamerscenter-slot-capture-extension\.zip/);
assert.match(manager, /StreamersCenterSlotCaptureSetup\.exe/);
assert.match(manager, /chrome:\/\/extensions/);
assert.match(manager, /extensionDetected/);

const extensionPackage = await fs.stat(path.join(root, 'public/downloads/streamerscenter-slot-capture-extension.zip'));
assert.equal(extensionPackage.isFile(), true);
assert.equal(extensionPackage.size > 1000, true, 'Published extension ZIP must contain the unpacked MV3 extension');
const windowsInstaller = await fs.stat(path.join(root, 'public/downloads/StreamersCenterSlotCaptureSetup.exe'));
assert.equal(windowsInstaller.isFile(), true);
assert.equal(windowsInstaller.size > 1_000_000, true, 'Published Windows installer must be a built executable');
const extensionReadme = await fs.readFile(path.join(root, 'browser-extension/README.txt'), 'utf8');
assert.match(extensionReadme, /Carregar expandida/);

console.log('Slot Capture foundation tests passed');
