import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';

const root = new URL('./', import.meta.url);
const source = await readFile(new URL('gas-vfx3d.js', root), 'utf8');
const launchOptions = {
  headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};
if (process.env.SC_CHROME_PATH) launchOptions.executablePath = process.env.SC_CHROME_PATH;
const browser = await puppeteer.launch(launchOptions);

try {
  await mkdir(new URL('gas-render-evidence/', root), { recursive: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const results = await page.evaluate(source => {
    const c = document.createElement('canvas');
    c.width = 960; c.height = 540;
    const g = c.getContext('2d');
    g.fillStyle = '#e8eef1';
    g.beginPath(); g.ellipse(480, 116, 45, 55, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.roundRect(430, 163, 100, 230, 34); g.fill();
    g.beginPath(); g.roundRect(367, 185, 63, 205, 28); g.fill();
    g.beginPath(); g.roundRect(530, 185, 63, 205, 28); g.fill();
    g.beginPath(); g.roundRect(433, 370, 43, 160, 18); g.fill();
    g.beginPath(); g.roundRect(484, 370, 43, 160, 18); g.fill();
    const subject = document.createElement('canvas');
    subject.width = c.width; subject.height = c.height;
    subject.getContext('2d').drawImage(c, 0, 0);
    const mask = subject.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    new Function(source)();

    const read = renderer => {
      const gl = renderer.gl, w = renderer.canvas.width, h = renderer.canvas.height;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return { pixels, w, h };
    };
    const summarize = frame => {
      let subjectPixels = 0, opaqueSubject = 0, outsideAlpha = 0, cornerAlpha = [];
      let alphaWeight = 0, alphaYWeight = 0;
      const colors = new Set();
      const { pixels, w, h } = frame;
      for (let y = 0; y < 540; y += 3) for (let x = 0; x < 960; x += 3) {
        const sx = Math.min(w - 1, Math.floor((x + .5) * w / 960));
        const syTop = Math.min(h - 1, Math.floor((y + .5) * h / 540));
        const i = ((h - 1 - syTop) * w + sx) * 4;
        const a = pixels[i + 3];
        alphaWeight += a;
        alphaYWeight += a * y / 540;
        if (mask[(y * 960 + x) * 4 + 3] >= 196) {
          subjectPixels++;
          if (a >= 250) opaqueSubject++;
          colors.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`);
        } else if (a >= 128) outsideAlpha++;
      }
      const points = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
      for (const [x,y] of points) cornerAlpha.push(pixels[(y*w+x)*4+3]);
      return {
        coverage: subjectPixels ? opaqueSubject / subjectPixels : 0,
        alphaCentroidY: alphaWeight ? alphaYWeight / alphaWeight : null,
        texturedColors: colors.size,
        outsideAlpha,
        cornerAlpha,
      };
    };
    const output = [];
    for (const effect of ['smoke', 'toxic']) {
      const renderer = new SCGasVolume.Renderer();
      renderer.prepare(subject, 960, 540, 'Cinematic', effect, 78);
      if (!renderer.isReady) throw new Error(`${effect}: renderer did not prepare`);
      if (!renderer.maskBoundsFound) throw new Error(`${effect}: camera matte bounds were not found`);
      renderer.draw(.42, true, .9);
      const earlyBuild = summarize(read(renderer));
      renderer.draw(.72, true, 1.6);
      const developedBuild = summarize(read(renderer));
      renderer.draw(1, true, 2.2);
      const handoff = read(renderer);
      const handoffSummary = summarize(handoff);
      output.push({ effect, diagnostics: renderer.diagnostics(), earlyBuild,
        developedBuild, handoff: handoffSummary,
        handoffPng: renderer.canvas.toDataURL('image/png') });
      renderer.draw(0, false, 2.2);
      const releaseStart = summarize(read(renderer));
      renderer.draw(1, false, 4.0);
      const released = read(renderer);
      let remainingAlpha = 0;
      for (let i=3;i<released.pixels.length;i+=4) if(released.pixels[i]) remainingAlpha++;
      output[output.length-1].releaseStart = releaseStart;
      output[output.length-1].remainingAlphaAfterRelease = remainingAlpha;
      renderer.dispose();
    }
    return output;
  }, source);

  for (const result of results) {
    assert.ok(result.earlyBuild.alphaCentroidY !== null,
      `${result.effect}: plume did not emit during early bottom-up buildup`);
    assert.ok(result.developedBuild.alphaCentroidY < result.earlyBuild.alphaCentroidY,
      `${result.effect}: plume did not develop upward from its lower source`);
    assert.ok(result.handoff.coverage >= .985,
      `${result.effect}: unsafe optical handoff coverage ${result.handoff.coverage}`);
    assert.ok(result.handoff.texturedColors >= 20,
      `${result.effect}: covered vapor lacks visible material variation`);
    assert.ok(result.handoff.outsideAlpha > 500,
      `${result.effect}: lens billow did not expand beyond the camera matte`);
    assert.ok(result.handoff.cornerAlpha.every(alpha => alpha < 8),
      `${result.effect}: render introduced a rectangular alpha background`);
    assert.ok(result.releaseStart.coverage >= .985,
      `${result.effect}: release does not start from the covered handoff`);
    assert.equal(result.remainingAlphaAfterRelease, 0,
      `${result.effect}: release left stale alpha pixels`);
    const { handoffPng, ...report } = result;
    await writeFile(new URL(`gas-render-evidence/${result.effect}-lens-seal.png`, root),
      Buffer.from(handoffPng.split(',')[1], 'base64'));
    console.log(JSON.stringify(report));
  }
  console.log('PASS: smoke/toxic shader compile, textured lens seal, alpha coverage, expanded plume, transparent corners and clear release');
  await page.close();
} finally {
  await browser.close();
}
