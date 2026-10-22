import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { OVERLAY_SHOWCASE_CATALOG, OVERLAY_SHOWCASE_CATEGORIES, getFeaturedOverlayThemes, isLandingShowcaseTheme, isNewOverlayTheme } from '../src/components/LandingPage/overlayShowcaseCatalog.js';
import { WIDGET_COLOUR_THEMES } from '../src/components/OverlayCenter/widgets/shared/colourThemePalettes.js';

const published = OVERLAY_SHOWCASE_CATALOG.filter(theme => theme.published);
assert.equal(published.length, 6);
const landingThemes = OVERLAY_SHOWCASE_CATALOG.filter(isLandingShowcaseTheme);
assert.equal(getFeaturedOverlayThemes(6).length, 5);
assert.deepEqual(OVERLAY_SHOWCASE_CATEGORIES, ['All','Gaming','Casino','Custom']);
assert.equal(landingThemes.some(theme => theme.id === 'solverde'), false, 'exclusive Solverde remains out of the public landing gallery');
assert.equal(OVERLAY_SHOWCASE_CATALOG.find(theme => theme.id === 'solverde').published, true, 'Solverde stays published for the existing editor and overlay');
const compositionFiles = {galactic_command:'galacticCommandComposition.js',starter_studio:'starterStudioComposition.js',street_art:'streetArtComposition.js',solverde:'solverdeComposition.js',candy:'candyComposition.js',volcanic:'volcanicComposition.js',orbital:'orbitalComposition.js'};
for(const theme of OVERLAY_SHOWCASE_CATALOG){assert(WIDGET_COLOUR_THEMES.some(item=>item.key===theme.id),`${theme.id} is a real overlay theme id`);assert(existsSync(`src/components/OverlayCenter/editor/${compositionFiles[theme.id]}`),`${theme.id} has a real editor composition`);}
const orbital = OVERLAY_SHOWCASE_CATALOG.find(theme => theme.id === 'orbital');
assert.equal(orbital.published, false, 'Orbital is withheld until a safe scene preview is available');
assert.equal(orbital.thumbnail, null);
assert.equal(published.filter(theme => isNewOverlayTheme(theme, Date.parse('2026-10-25T00:00:00Z'))).length, 2, 'new badges follow the most recent publication date in the catalog');
assert.equal(published.some(theme => isNewOverlayTheme(theme, Date.parse('2026-12-01T00:00:00Z'))), false, 'new badges expire dynamically');
for (const theme of published) {
  assert(theme.destination === `/editor?theme=${theme.id}`, `${theme.id} must target the actual preset editor flow`);
  assert(existsSync(`public${theme.thumbnail}`), `${theme.id} thumbnail exists`);
  assert(existsSync(`public${theme.fullPreview}`), `${theme.id} full preview exists`);
  assert.equal(readFileSync(`public${theme.thumbnail}`).subarray(0,4).toString('hex'), '52494646', `${theme.id} thumbnail is WebP`);
  assert.equal(readFileSync(`public${theme.fullPreview}`).subarray(0,4).toString('hex'), '52494646', `${theme.id} full preview is WebP`);
}
const showcaseAssetBytes = published.reduce((sum, theme) => sum + readFileSync(`public${theme.thumbnail}`).length + readFileSync(`public${theme.fullPreview}`).length, 0);
assert(showcaseAssetBytes < 2_500_000, 'optimized scene assets stay under 2.5 MB total');

const server = await createServer({ logLevel:'silent', server:{host:'127.0.0.1',port:0,hmr:false} });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/,'');
const browser = await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',userDataDir:'C:/Users/miguel/AppData/Local/Temp/codex-showcase-test-profile',pipe:true,args:['--no-sandbox','--disable-gpu']});
try {
  const page = await browser.newPage(), errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/__showcase-test') return request.respond({contentType:'text/html',body:'<html><body style="margin:0;background:#030b18"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>'});
    if (url.origin === base) {
      fetch(url.href).then(async response => request.respond({ status:response.status, headers:{'content-type':response.headers.get('content-type') || 'text/plain'}, body:Buffer.from(await response.arrayBuffer()) })).catch(error => { console.error('Local bridge failed:',url.href,error.message); request.abort('failed').catch(()=>{}); });
      return;
    }
    return request.respond({contentType:'application/json',body:'[]'});
  });
  await page.goto(base+'/__showcase-test');
  await page.evaluate(async () => {
    const entry=await(await fetch('/src/main.jsx')).text(),reactUrl=entry.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1],version=reactUrl.split('?')[1];
    const React=(await import(reactUrl)).default,DOM=(await import('/node_modules/.vite/deps/react-dom_client.js?'+version)).default,router=await import('/node_modules/.vite/deps/react-router-dom.js?'+version);
    const {default:Gallery}=await import('/src/components/LandingPage/OverlayShowcase.jsx');
    DOM.createRoot(document.getElementById('root')).render(React.createElement(router.MemoryRouter,null,React.createElement(Gallery)));
  });
  await page.waitForSelector('.lp-scene-card');
  assert.equal(await page.$$eval('.lp-scene-card',cards=>cards.length),5);
  assert(await page.$$eval('.lp-scene-card img',images=>images.every(image=>image.loading==='lazy')));
  const dimensions = await page.evaluate(async themes => Promise.all(themes.flatMap(theme => [theme.thumbnail,theme.fullPreview]).map(async url => { const img=new Image();img.src=url;await img.decode();return [img.naturalWidth,img.naturalHeight]; })), published);
  assert(dimensions.every(([width,height],index) => index % 2 === 0 ? width === 960 && height === 540 : width === 1920 && height === 1080), 'scene captures and 16:9 thumbnails decode at their declared dimensions');
  assert(await page.$eval('.lp-scene-card__image-button',button=>Math.abs(button.getBoundingClientRect().width/button.getBoundingClientRect().height-16/9)<0.02));
  for(const category of ['Casino','Gaming','Custom']){
    await page.$$eval('.lp-overlay-showcase__filters button', (buttons, label) => buttons.find(button => button.textContent.trim() === label)?.click(), category);
    const count = landingThemes.filter(theme=>theme.category===category).length;
    assert.equal(await page.$$eval('.lp-scene-card',cards=>cards.length),count);
  }
  await page.$$eval('.lp-overlay-showcase__filters button', buttons => buttons.find(button => button.textContent.trim() === 'All')?.click());
  assert.equal(await page.$$eval('.lp-scene-card',cards=>cards.length),5);
  assert.equal(await page.$$eval('.lp-scene-card h3',headings=>headings.some(heading=>heading.textContent.trim()==='Solverde')),false,'exclusive Solverde is not rendered in any landing gallery filter');
  await page.click('.lp-scene-card__image-button');
  await page.waitForSelector('[role="dialog"]');
  assert(await page.$eval('[role="dialog"] img',img=>img.naturalWidth>0));
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent.includes('Use this theme')),true,'focus wraps to the last action inside the dialog');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')), 'Close preview', 'focus wraps to close control');
  const firstThemeName=await page.$eval('#scene-dialog-title',heading=>heading.textContent);
  await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.$eval('#scene-dialog-title',heading=>heading.textContent),firstThemeName,'arrow navigation changes the preview');
  await page.keyboard.press('Escape');
  assert.equal(await page.$('[role="dialog"]'),null);
  assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('lp-scene-card__image-button')),true);
  const editorDestination=await page.$eval('.lp-scene-card__use',link=>link.getAttribute('href'));
  assert.match(editorDestination,/^\/editor\?theme=/);
  for(const width of [320,390,768,1440]){
    await page.setViewport({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no horizontal overflow at ${width}px`);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS overlay showcase: five public scene captures, exclusive Solverde withheld from homepage filters, catalog assets, modal keyboard and focus, editor destination, responsive widths, incomplete preview withheld.');
} finally { await browser.close(); await server.close(); }
