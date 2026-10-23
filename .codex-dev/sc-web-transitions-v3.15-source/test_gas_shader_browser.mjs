import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';


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
          if (a >= 254) opaqueSubject++;
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
    const output = [], captures=[];
    for (const effect of ['smoke', 'toxic']) {
      const renderer = new SCGasVolume.Renderer();
      renderer.prepare(subject, 960, 540, 'Cinematic', effect, 78);
      if (!renderer.isReady) throw new Error(`${effect}: renderer did not prepare`);
      if (!renderer.maskBoundsFound) throw new Error(`${effect}: camera matte bounds were not found`);
      renderer.draw(.42, true, .9);
      const earlyBuild = summarize(read(renderer));
      captures.push({effect,stage:'building',data:renderer.canvas.toDataURL('image/png')});
      renderer.draw(.72, true, 1.6);
      const developedBuild = summarize(read(renderer));
      captures.push({effect,stage:'growing',data:renderer.canvas.toDataURL('image/png')});
      renderer.draw(1, true, 2.2);
      const handoff = read(renderer);
      const handoffSummary = summarize(handoff);
      captures.push({effect,stage:'covered',data:renderer.canvas.toDataURL('image/png')});
      const sampledCoverage = renderer.measureCoverage({mw:960,mh:540,map:mask});
      output.push({ effect, diagnostics: renderer.diagnostics(), earlyBuild,
        developedBuild, handoff: handoffSummary, sampledCoverage,
        handoffPng: renderer.canvas.toDataURL('image/png') });
      renderer.draw(0, false, 2.2);
      const releaseFrame = read(renderer);
      const releaseStart = summarize(releaseFrame);
      let handoffDifference=0;for(let i=0;i<handoff.pixels.length;i++)handoffDifference+=Math.abs(handoff.pixels[i]-releaseFrame.pixels[i]);
      output[output.length-1].handoffDifference=handoffDifference;
      renderer.draw(0,false,2.4);const movingHold=read(renderer);
      let holdDifference=0;for(let i=0;i<movingHold.pixels.length;i++)holdDifference+=Math.abs(movingHold.pixels[i]-releaseFrame.pixels[i]);
      output[output.length-1].holdDifference=holdDifference;
      captures.push({effect,stage:'switch-hold',data:renderer.canvas.toDataURL('image/png')});
      renderer.draw(.5,false,3.1);captures.push({effect,stage:'dispersion',data:renderer.canvas.toDataURL('image/png')});
      renderer.draw(.999,false,3.998);const almostReleased=read(renderer);let lateAlpha=0;for(let i=3;i<almostReleased.pixels.length;i+=4)lateAlpha=Math.max(lateAlpha,almostReleased.pixels[i]);
      output[output.length-1].lateMaxAlpha=lateAlpha;
      renderer.draw(1, false, 4.0);
      const released = read(renderer);
      captures.push({effect,stage:'idle',data:renderer.canvas.toDataURL('image/png')});
      let remainingAlpha = 0;
      for (let i=3;i<released.pixels.length;i+=4) if(released.pixels[i]) remainingAlpha++;
      output[output.length-1].releaseStart = releaseStart;
      output[output.length-1].remainingAlphaAfterRelease = remainingAlpha;
      const cachedProgram=renderer.program,cachedNoise=renderer.noise;
      renderer.prepare(subject,960,540,'Balanced',effect,78);
      output[output.length-1].resourcesReused=cachedProgram===renderer.program&&cachedNoise===renderer.noise;
      renderer.draw(1,true,2.2);
      output[output.length-1].repeatCoverage=renderer.measureCoverage({mw:960,mh:540,map:mask});
      renderer.dispose();
      output[output.length-1].canvasRemoved=!renderer.canvas.isConnected;
    }
    return {output,captures};
  }, source);

  for (const capture of results.captures) await writeFile(new URL(`gas-render-evidence/${capture.effect}-${capture.stage}.png`,root),Buffer.from(capture.data.split(',')[1],'base64'));
  for (const result of results.output) {
    await writeFile(new URL(`gas-render-evidence/${result.effect}-volume.png`, root), Buffer.from(result.handoffPng.split(',')[1], 'base64'));
    assert.ok(result.earlyBuild.alphaCentroidY !== null,
      `${result.effect}: plume did not emit during early bottom-up buildup`);
    assert.ok(result.developedBuild.alphaCentroidY < result.earlyBuild.alphaCentroidY,
      `${result.effect}: plume did not develop upward from its lower source`);
    assert.ok(result.handoff.coverage >= .995,
      `${result.effect}: unsafe optical handoff coverage ${result.handoff.coverage}`);
    assert.ok(result.handoff.texturedColors >= 20,
      `${result.effect}: covered vapor lacks visible material variation`);
    assert.ok(result.handoff.outsideAlpha > 500,
      `${result.effect}: lens billow did not expand beyond the camera matte`);
    assert.ok(result.handoff.cornerAlpha.every(alpha => alpha < 8),
      `${result.effect}: render introduced a rectangular alpha background`);
    assert.ok(result.releaseStart.coverage >= .995,
      `${result.effect}: release does not start from the covered handoff`);
    assert.equal(result.remainingAlphaAfterRelease, 0,
      `${result.effect}: release left stale alpha pixels`);
    assert.ok(result.sampledCoverage>=.995,`${result.effect}: sampled coverage was unsafe`);
    assert.equal(result.handoffDifference,0,`${result.effect}: cover/release changed appearance at identical time`);
    assert.ok(result.holdDifference>1000,`${result.effect}: covered waiting volume froze`);
    assert.ok(result.lateMaxAlpha<=1,`${result.effect}: volume popped at final cleanup`);
    assert.ok(result.resourcesReused,`${result.effect}: repeated prepare did not reuse GPU resources`);
    assert.ok(result.repeatCoverage>=.995,`${result.effect}: reused renderer failed cover`);
    assert.ok(result.canvasRemoved,`${result.effect}: dispose left a canvas`);
    const { handoffPng, ...report } = result;
    await writeFile(new URL(`gas-render-evidence/${result.effect}-lens-seal.png`, root),
      Buffer.from(handoffPng.split(',')[1], 'base64'));
    console.log(JSON.stringify(report));
  }
  await writeFile(new URL('gas-render-evidence/regression.json',root),JSON.stringify({environment:'Headless Chrome SwiftShader software renderer, 960x540 synthetic silhouette; no OBS',results:results.output.map(({handoffPng,...r})=>r)},null,2));
  console.log('PASS: real smoke/toxic GLSL draw, strict 99.5% optical coverage, continuous handoff and hold, transparent corners, no final pop, repeated prepare and clean disposal');
  await page.close();
} finally {
  await browser.close();
}
