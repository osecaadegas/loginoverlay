import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const source = await readFile(new URL('./gpu-vfx3d.js', import.meta.url), 'utf8');
const options = {
  headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};
if (process.env.SC_CHROME_PATH) options.executablePath = process.env.SC_CHROME_PATH;
const browser = await puppeteer.launch(options);

try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const results = await page.evaluate(async source => {
    new Function(source)();
    const types = ['glitch', 'lightning', 'shadow', 'holy', 'sand', 'crystal', 'petal', 'plasma'];
    const subject = document.createElement('canvas'); subject.width = 640; subject.height = 360;
    const sg = subject.getContext('2d');
    sg.fillStyle = '#dfe9f3'; sg.beginPath(); sg.ellipse(320, 72, 46, 54, 0, 0, Math.PI * 2); sg.fill();
    sg.beginPath(); sg.roundRect(264, 122, 112, 132, 34); sg.fill();
    sg.beginPath(); sg.roundRect(211, 137, 55, 126, 24); sg.fill();
    sg.beginPath(); sg.roundRect(374, 137, 55, 126, 24); sg.fill();
    sg.beginPath(); sg.roundRect(269, 237, 48, 118, 20); sg.fill();
    sg.beginPath(); sg.roundRect(323, 237, 48, 118, 20); sg.fill();
    const mask = document.createElement('canvas'); mask.width = 160; mask.height = 90;
    const mg = mask.getContext('2d'); mg.drawImage(subject, 0, 0, 160, 90);
    const raw = mg.getImageData(0, 0, 160, 90).data, map = new Uint8ClampedArray(160 * 90 * 4), points = [];
    for (let y = 0; y < 90; y++) for (let x = 0; x < 160; x++) {
      const k = (y * 160 + x) * 4, alpha = raw[k + 3];
      map[k + 3] = alpha;
      if (alpha > 128) points.push([(x + .5) * 4, (y + .5) * 4]);
    }
    const field = { mw: 160, mh: 90, map, points,
      contains: (x, y) => ((x - 320) / 111) ** 2 + ((y - 238) / 238) ** 2 < 1 };
    const contact = {};
    const reports = [];
    const renderer = new SCGPU3D.Renderer();
    for (const type of types) {
      const particles = Array.from({ length: 72 }, (_, i) => {
        const point = points[(i * 17) % points.length];
        return { x: point[0], y: point[1], depth: .72 + (i % 8) * .08, size: .65 + (i % 5) * .16,
          tx: Math.sin(i * 2.37) * 160, ty: -60 - (i % 9) * 35, spin: Math.sin(i * 1.47) * 2.8,
          phase: i * 2.399, delay: (i % 13) / 60 };
      });
      const fx = { type, W: 640, H: 360, quality: 'Cinematic', tuning: { accent: '#55baff' },
        config: { color: '#55baff', inBuild: .61 }, motion: 1,
        seal: subject, particles, b: { x: 205, y: 18, w: 230, h: 338 }, field,
        arcs: Array.from({ length: 8 }, (_, i) => ({ pts: [[260 + i * 12, 140], [275 + i * 8, 190], [295 + i * 6, 230]] })) };
      renderer.prepare(fx);
      const gl = renderer.gl;
      const sample = () => {
        const w = renderer.canvas.width, h = renderer.canvas.height, pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let visible = 0, outside = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 8) visible++;
        for (const [x, y] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]]) if (pixels[(y*w+x)*4+3] > 8) outside++;
        return { visible, outside, coverage: renderer.measureCoverage(field) };
      };
      const phases = [
        ['cover', .68, 1.6], ['handoff', 'handoff', 1.95], ['out', .45, 2.4], ['in', .55, 3.1],
      ];
      const images = {};
      for (const [name, progress, time] of phases) {
        if (name === 'handoff') renderer.render('cover', 1, time);
        else renderer.render(name, progress, time);
        images[name] = renderer.canvas.toDataURL('image/png');
        const metrics = sample();
        reports.push({ type, phase: name, ...metrics });
        if (!contact[name]) { contact[name] = document.createElement('canvas'); contact[name].width = 1280; contact[name].height = 360; }
        const cell = new Image();
        cell.src = images[name];
        await new Promise((resolve, reject) => { cell.onload = resolve; cell.onerror = reject; });
        const sheet = contact[name].getContext('2d');
        const index = types.indexOf(type), col = index % 4, row = Math.floor(index / 4);
        sheet.drawImage(cell, col * 320, row * 180, 320, 180);
        sheet.fillStyle = 'rgba(0,0,0,.72)'; sheet.fillRect(col * 320, row * 180, 120, 22);
        sheet.fillStyle = 'white'; sheet.font = '14px sans-serif'; sheet.fillText(`${type.toUpperCase()} · ${name}`, col * 320 + 7, row * 180 + 16);
        if (name === 'handoff' && metrics.coverage < .985) throw new Error(`${type}: handoff coverage ${metrics.coverage}`);
        if (name === 'handoff' && metrics.outside) throw new Error(`${type}: non-transparent viewport corners`);
        if (name === 'cover' && metrics.visible < 500) throw new Error(`${type}: cover output was empty`);
      }
      renderer.dispose();
    }
    renderer.canvas.remove();
    return { reports, sheets: Object.fromEntries(Object.entries(contact).map(([name, canvas]) => [name, canvas.toDataURL('image/png')])) };
  }, source);

  await mkdir(new URL('./gpu-render-evidence/', import.meta.url), { recursive: true });
  for (const [name, dataUrl] of Object.entries(results.sheets)) {
    await writeFile(new URL(`./gpu-render-evidence/${name}-contact-sheet.png`, import.meta.url), Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  await writeFile(new URL('./gpu-render-evidence/metrics.json', import.meta.url), JSON.stringify(results.reports, null, 2));
  for (const report of results.reports.filter(item => item.phase === 'handoff')) assert.ok(report.coverage >= .985, `${report.type} handoff coverage`);
  console.log(`PASS: actual production WebGL2 render for eight effect families; wrote three phase contact sheets and ${results.reports.length} measurements`);
  await page.close();
} finally {
  await browser.close();
}
