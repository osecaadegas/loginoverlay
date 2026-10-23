import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';
import { WIDGET_COLOUR_THEMES, getWidgetColourTheme, getHuntColourTheme, getWidgetColourThemeGroups } from '../src/components/OverlayCenter/widgets/shared/colourThemePalettes.js';
import {
  countCompletedSlotBingoSquares,
  getSlotBingoSquareCount,
  normalizeSlotBingoConfig,
} from '../src/components/OverlayCenter/widgets/slot-bingo/slotBingoModel.js';

const defaultBingo = normalizeSlotBingoConfig({});
const compactBingo = normalizeSlotBingoConfig({ ...defaultBingo, boardRows: 3 });
const restoredBingo = normalizeSlotBingoConfig({ ...compactBingo, boardRows: 5 });
assert.equal(getSlotBingoSquareCount(compactBingo.boardRows), 15, '3 x 5 board has 15 visible options');
assert.equal(compactBingo.squares[7].free, true, '3 x 5 board moves FREE to its center');
assert.equal(compactBingo.squares[12].label, defaultBingo.squares[7].label, 'hidden square data survives compact mode');
assert.equal(restoredBingo.squares[12].free, true, '5 x 5 board restores FREE to its center');
assert.equal(restoredBingo.squares[7].label, defaultBingo.squares[7].label, 'layout switching preserves square labels');
assert.equal(countCompletedSlotBingoSquares(compactBingo.squares, 3) <= 15, true, 'compact progress only counts visible squares');
assert.equal(defaultBingo.squares.every(square => Number.isFinite(square.multiplier)), true, 'every Bingo option has a payout multiplier');

const newThemes = ['gold', 'violet', 'rose', 'arctic', 'clear_ice', 'lime', 'luxe', 'gladiator', 'old_rome', 'orbital'];
const clearIceCss = readFileSync(new URL('../src/components/OverlayCenter/editor/ClearIceTheme.css', import.meta.url), 'utf8');
const themeEffectsCss = readFileSync(new URL('../src/effects/ThemeEffects/ThemeEffects.css', import.meta.url), 'utf8');
const clearIceGlass = readFileSync(new URL('../public/theme-effects/clear-ice/clear-ice-glass-20.png', import.meta.url));
const clearIceFractures = readFileSync(new URL('../public/theme-effects/clear-ice/clear-ice-fractures.png', import.meta.url));
assert.deepEqual(WIDGET_COLOUR_THEMES.map(theme => theme.key), ['galactic_command','starter_studio','street_art', 'solverde', 'volcanic', 'candy', 'neon', 'metallic', 'sunset', 'cyberpunk', 'crimson', 'emerald', ...newThemes]);
assert.equal(getWidgetColourTheme('clear_ice').adminOnly, true, 'Clear Ice is marked as admin-only');
assert(!getWidgetColourThemeGroups((key, theme) => !theme.adminOnly).some(group => group.themes.some(theme => theme.key === 'clear_ice')), 'non-admin theme catalog omits Clear Ice');
assert(getWidgetColourThemeGroups((key, theme) => Boolean(theme.adminOnly)).some(group => group.themes.some(theme => theme.key === 'clear_ice')), 'admin theme catalog includes Clear Ice');
assert.doesNotMatch(themeEffectsCss, /clear_ice/, 'Clear Ice does not inherit Arctic-only dark material rules');
assert.match(clearIceCss, /rgba\(18, 50, 84, \.22\)/, 'Clear Ice uses a translucent 22% outer glass shell');
assert.match(clearIceCss, /--clear-ice-card-surface:\s*rgba\(216, 243, 251, \.22\)/, 'Clear Ice uses one shared 22% pale-glass surface for inner cards');
assert.match(clearIceCss, /--clear-ice-shell-surface:\s*rgba\(18, 50, 84, \.22\)/, 'Clear Ice uses one shared translucent surface for widget shells');
assert.doesNotMatch(clearIceCss, /rgba\(10, 43, 74, \.44\)|rgba\(216, 243, 251, \.42\)|rgba\(216, 243, 251, \.38\)/, 'Clear Ice avoids inconsistent dark and near-opaque card fills');
assert.equal(getWidgetColourTheme('clear_ice').background, '#D8F3FB', 'Clear Ice uses pale frost for its light glass base');
assert.equal(getWidgetColourTheme('clear_ice').surface, '#B7DDED', 'Clear Ice uses glacier blue for translucent panels');
assert.equal(getWidgetColourTheme('clear_ice').raised, '#89D9FF', 'Clear Ice uses ice glow for readable raised surfaces');
assert.equal(getWidgetColourTheme('clear_ice').border, '#296299', 'Clear Ice uses Glacier Blue for its borders');
assert.equal(getWidgetColourTheme('clear_ice').secondary, '#123254', 'Clear Ice uses Frozen Navy as its supporting accent');
assert.equal(getWidgetColourTheme('clear_ice').text, '#FFFFFF', 'Clear Ice primary text is white');
assert.equal(getWidgetColourTheme('clear_ice').muted, '#FFFFFF', 'Clear Ice muted text is white');
assert.match(clearIceCss, /data-widget-type="camera"/, 'Clear Ice keeps source openings transparent');
assert.match(clearIceCss, /clear-ice-glass-20\.png/, 'Clear Ice uses the reduced-opacity glass texture');
assert.match(clearIceCss, /clear-ice-fractures\.png/, 'Clear Ice uses its original fracture texture');
assert.doesNotMatch(clearIceCss, /theme-effects\/ice\//, 'Clear Ice no longer references the Arctic material assets');
assert.equal(clearIceGlass.toString('ascii', 1, 4), 'PNG', 'Clear Ice glass surface is a PNG texture');
assert.equal(clearIceGlass.readUInt32BE(16), 1254, 'Clear Ice glass texture has full-resolution width');
assert.equal(clearIceGlass[25], 6, 'Clear Ice opacity texture uses an alpha channel');
const glassData = [];
for (let offset = 8; offset < clearIceGlass.length;) {
  const length = clearIceGlass.readUInt32BE(offset);
  if (clearIceGlass.toString('ascii', offset + 4, offset + 8) === 'IDAT') glassData.push(clearIceGlass.subarray(offset + 8, offset + 8 + length));
  offset += length + 12;
}
assert.equal(inflateSync(Buffer.concat(glassData))[4], 51, 'Clear Ice texture artwork is baked at 20% opacity');
assert.equal(clearIceFractures.toString('ascii', 1, 4), 'PNG', 'Clear Ice fracture overlay is a PNG texture');
assert.equal(clearIceFractures[25], 6, 'Clear Ice fracture texture retains true RGBA transparency');
assert.equal(clearIceFractures.readUInt32BE(16), 1254, 'Clear Ice fracture overlay has full-resolution width');
assert.match(clearIceCss, /\.bets-ov__card/, 'Clear Ice styles the dedicated bets widget surfaces');
assert.match(clearIceCss, /\.better-bets-stage \.bet-widget/, 'Clear Ice frames the bets widget content instead of its full-stage wrapper');
assert.match(clearIceCss, /\.better-bets-stage :is\(\.bet-option, \.bet-bar\)/, 'Clear Ice textures individual bet cards and bars');
assert.match(clearIceCss, /data-widget-type="chat"\] \.ov-chat-messages/, 'Clear Ice textures the chat message surface');
assert.match(clearIceCss, /data-widget-type="chat"\] \.ov-chat-giveaway-source-card[\s\S]*clear-ice-fractures\.png/, 'Clear Ice overrides the inline-styled giveaway card embedded in streamer chat');
assert.match(clearIceCss, /data-widget-type="chat"\] \.ov-chat-giveaway-canvas \.better-gw-metric-panel[\s\S]*rgba\(10, 43, 74, \.7\)/, 'Clear Ice giveaway metric tiles keep the deep glass treatment inside chat');
assert.match(clearIceCss, /data-widget-type="connect_four"\] \.connect-four-player-rail[\s\S]*clear-ice-glass-20\.png/, 'Clear Ice styles Connect Four player rails with the shared glass texture');
assert.match(clearIceCss, /data-widget-type="connect_four"\] \.connect-four-board[\s\S]*clear-ice-fractures\.png/, 'Clear Ice styles the Connect Four board with the fracture texture');
assert.match(clearIceCss, /\.slot-bingo-widget__square/, 'Clear Ice covers Slot Bingo square surfaces');
assert.match(clearIceCss, /\.better-navbar-zone/, 'Clear Ice covers navbar zones');
assert.match(clearIceCss, /\.bhh-stats-panel/, 'Clear Ice covers Bonus Hunt stats surfaces');
assert.match(clearIceCss, /\.bhh-stats-header[\s\S]*\.cg-info/, 'Clear Ice aligns Bonus Hunt and current-game card materials');
assert.match(clearIceCss, /\.better-giveaway-widget[\s\S]*\.ov-chat-messages[\s\S]*\.bets-ov__card/, 'Clear Ice gives giveaway, chat and bet cards the shared glass material');
assert.match(clearIceCss, /\.better-widget-colour-scope\.better-widget-colour-scope\[data-colour-theme="clear_ice"\] \*:not\(svg\):not\(path\)\s*\{\s*color:\s*#fff !important;\s*-webkit-text-stroke:\s*\.3px rgba\(0, 0, 0, \.96\) !important/s, 'Clear Ice forces scoped white text with a dark contour');
assert.match(clearIceCss, /data-widget-type="rtp_stats"\] \.rtp-stats-item/, 'Clear Ice textures RTP metric cards');
assert.match(clearIceCss, /data-widget-type="navbar"\] \[data-widget-element="container"\][\s\S]*clear-ice-glass-20\.png/, 'Clear Ice textures the top navigation rail with reduced opacity');
assert.match(clearIceCss, /background-blend-mode:\s*soft-light, soft-light, soft-light[\s\S]*background-size:\s*100% 100%, cover, cover/, 'Clear Ice navbar and RTP rail share one glass and fracture texture treatment');
assert.match(clearIceCss, /data-widget-type="navbar"\]\s*:is\(\.better-navbar-content, \.better-navbar-zone\)\s*\{\s*background:\s*transparent !important;/, 'Clear Ice navbar layout wrappers stay transparent so they cannot wash out the shared rail material');
assert.match(clearIceCss, /\.better-widget-colour-scope\.better-widget-colour-scope\[data-colour-theme="clear_ice"\]\s*:is\(\.better-hunt-stat, \.better-hunt-image-stats-panel, \.better-hunt-total[\s\S]*\.bets-ov__stat, \.bets-ov__card[\s\S]*background-image:\s*linear-gradient\(180deg, #0a2b4a, #123254\) !important;\s*border:\s*1px solid rgba\(137, 217, 255, \.55\) !important;\s*border-radius:\s*10px !important/s, 'Clear Ice stat and betting surfaces match the on-canvas giveaway field material');
assert.match(clearIceCss, /data-colour-theme="clear_ice"\]\s*\*:not\(svg\):not\(path\)\s*\{\s*color:\s*#fff !important;\s*-webkit-text-stroke:\s*\.3px rgba\(0, 0, 0, \.96\) !important;/, 'Clear Ice uses white text with a black contour');
assert.match(clearIceCss, /data-widget-type="rtp_stats"\] \[data-better-element="statCard"\][\s\S]*background:\s*transparent !important/, 'Clear Ice RTP stat cards reveal the continuous parent bar texture');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-panel[\s\S]*background-color:\s*rgba\(18, 50, 84, \.08\)/, 'Clear Ice Bonus Hunt shell stays highly transparent');
assert.match(clearIceCss, /better-widget-colour-scope\.better-widget-colour-scope\[data-colour-theme="clear_ice"\]\[data-widget-type="bonus_hunt"\] \.better-hunt-panel[\s\S]*background-color:\s*rgba\(18, 50, 84, \.08\)/, 'Clear Ice Bonus Hunt opacity wins over the widget skin material');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-row--image\s*\{[\s\S]*background-image:\s*linear-gradient\(180deg, #0a2b4a, #123254\) !important;/, 'Clear Ice carousel cards match the main stat card deep-glass fill');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-stat strong\s*\{\s*font-size:\s*1\.42em !important;/, 'Clear Ice Bonus Hunt stat values use larger overlay-scale type');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-row--image \.better-hunt-mini-stats \.better-hunt-mini-stat\s*\{\s*font-size:\s*1\.16em !important;/, 'Clear Ice carousel metric values use larger type');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-row--image \.better-hunt-mini-label\s*\{\s*font-size:\s*\.98em !important;/, 'Clear Ice carousel metric labels use larger type');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-stat-label\s*\{\s*font-size:\s*\.98em !important;/, 'Clear Ice Bonus Hunt stat labels use larger overlay-scale type');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-total-head > strong\s*\{\s*font-size:\s*1\.4em !important;/, 'Clear Ice Bonus Hunt total pay uses larger type');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-progress,\s*\.better-widget-colour-scope[\s\S]*\.better-hunt-progress-summary\s*\{\s*background-color:\s*transparent !important;\s*background-image:\s*none !important;/, 'Clear Ice progress copy sits on a clean surface without texture stripes');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\]\s*:is\([\s\S]*\.better-hunt-stat,[\s\S]*\.better-hunt-image-stats-panel,[\s\S]*\.better-hunt-row--image[\s\S]*border-radius:\s*12px !important;/, 'Clear Ice Bonus Hunt stats and carousel cards have rounded corners');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-list::before,[\s\S]*backdrop-filter:\s*blur\(3px\)[\s\S]*data-widget-type="bonus_hunt"\] \.better-hunt-list::after\s*\{[\s\S]*bottom:\s*0;/, 'Clear Ice fades and blurs the top and bottom edges of the slot carousel');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-progress-summary > span\s*\{\s*display:\s*none !important;/, 'Clear Ice progress shows the count without the Opened label');
assert.match(clearIceCss, /data-widget-type="current_slot"\]\s*:is\(\.cg-info, \.cg-records, \.cg-stat\)\s*\{\s*background-color:\s*transparent !important;\s*background-image:\s*none !important;/, 'Clear Ice current-game stat areas reveal the parent widget texture');
assert.match(clearIceCss, /data-widget-type="giveaway"\] \.better-gw-header,[\s\S]*\.ov-chat-giveaway-canvas \.better-gw-header\s*\{[\s\S]*background-color:\s*transparent !important;\s*background-image:\s*none !important;/, 'Clear Ice giveaway headings do not create a flat contrasting strip');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\]\s*:is\(\.better-hunt-progress, \.better-hunt-progress-summary, \.better-hunt-main-progress, \.bht-compact-progress-section, \.bht-progress\)\s*\{[\s\S]*background-color:\s*transparent !important;\s*background-image:\s*none !important;/, 'Clear Ice Bonus Hunt progress variants reveal the panel texture');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\]\s*:is\(\.better-hunt-stat, \.better-hunt-image-stats-panel, \.better-hunt-total, \.better-hunt-row--image, \.better-hunt-result\)\s*\{\s*background-color:\s*rgba\(18, 50, 84, \.12\) !important;[\s\S]*clear-ice-glass-20\.png/, 'Clear Ice Bonus Hunt stats and carousel use lower-opacity textured glass');
assert.match(clearIceCss, /data-widget-type="bets"\]\s*\.bets-ov--compact-scoreboard \.bets-ov__card-fill\s*\{\s*opacity:\s*\.72 !important;[\s\S]*linear-gradient\(90deg, rgba\(216, 243, 251, \.58\), rgba\(137, 217, 255, \.48\) 52%, rgba\(101, 156, 210, \.38\)\)[\s\S]*clear-ice-fractures\.png/, 'Clear Ice compact Bets live fill uses a translucent frozen texture');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-track > span\s*\{\s*border-radius:\s*inherit !important;\s*background:\s*linear-gradient\(90deg, #39bfff, #89d9ff 68%, #d8f3fb\) !important;\s*box-shadow:\s*0 0 7px rgba\(70, 195, 255, \.95\), 0 0 16px rgba\(70, 195, 255, \.72\) !important;/, 'Clear Ice progress fill uses a luminous blue gradient and glow');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-mini-stat:nth-child\(2\) > \*\s*\{\s*color:\s*#89d9ff !important;/, 'Clear Ice carousel multiplier label and value share a cyan identity');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-mini-stat--best \.better-hunt-mini-best-value > small\s*\{\s*color:\s*#89d9ff !important;/, 'Clear Ice Best multiplier uses cyan while Best payout remains white');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\]\s*:is\([\s\S]*\.better-hunt-result-face--best \.better-hunt-result,[\s\S]*\.better-hunt-result-face--worst \.better-hunt-result[\s\S]*background:\s*linear-gradient\(180deg, #0a2b4a, #123254\) !important;/, 'Clear Ice Best and Worst outer faces use the same deep-glass treatment as carousel cards');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-result-payout > span,[\s\S]*\.better-hunt-result-row > span\s*\{\s*font-size:\s*1\.12em !important;/, 'Clear Ice Best and Worst labels are enlarged for overlay readability');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\] \.better-hunt-result-row > strong\s*\{\s*font-size:\s*1\.52em !important;/, 'Clear Ice Best and Worst metric values use larger type');
assert.match(clearIceCss, /data-widget-type="bonus_hunt"\]\s*:is\([\s\S]*\.better-hunt-result-payout,[\s\S]*\.better-hunt-result-row[\s\S]*background:\s*rgba\(10, 43, 74, \.88\) !important;/, 'Clear Ice Best and Worst metric wells retain their dark readable fill');
assert.match(clearIceCss, /data-widget-type="chat"\] \.ov-chat-widget,[\s\S]*data-widget-type="bonus_hunt"\][\s\S]*background-blend-mode:\s*soft-light, soft-light, soft-light/, 'Clear Ice Chat and Bonus Hunt use softened shell textures');
assert.match(clearIceCss, /\.better-hunt-stats-panel[\s\S]*\.ov-chat-giveaway/, 'Clear Ice covers the inner hunt and chat surfaces with glass texture');
assert.match(clearIceCss, /background-blend-mode:\s*normal, soft-light/, 'Clear Ice keeps texture detail subtle over translucent glass');
assert.doesNotMatch(clearIceCss, /\.better-giveaway-stage,\s*\.better-bets-stage|\.better-tournament-stage/, 'Clear Ice leaves full-canvas stage wrappers borderless');
assert.match(clearIceCss, /> \[data-widget-element="container"\]/, 'Clear Ice only applies generic container frames to the widget root');
assert.match(clearIceCss, /mix-blend-mode:\s*screen/, 'Clear Ice blends fracture texture as a luminous overlay');
assert.match(clearIceCss, /opacity:\s*\.14/, 'Clear Ice keeps fracture texture restrained enough to see through');
assert.deepEqual(
  [getWidgetColourTheme('gladiator').background, getWidgetColourTheme('gladiator').raised, getWidgetColourTheme('gladiator').accent, getWidgetColourTheme('gladiator').text],
  ['#071018', '#d8a43a', '#7e1518', '#f4e3ba'],
  'Gladiator keeps its dark Roman background, antique gold face, crimson accent and warm ivory text',
);
assert.equal(getHuntColourTheme('theme_gladiator').steelHi, '#f4e3ba', 'Gladiator Bonus Hunt uses warm ivory on dark surfaces');
for (const [key, surface] of [['gradient', '#131a4a'], ['matte', '#181d24']]) {
  assert.equal(getWidgetColourTheme(key).surface, surface, `${key}: retain saved palette`);
  assert.equal(getHuntColourTheme(`theme_${key}`).panelMid, surface, `${key}: retain saved Hunt appearance`);
}
const luminance = color => color.slice(1).match(/../g).map(hex => {
  const channel = parseInt(hex, 16) / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
for (const theme of WIDGET_COLOUR_THEMES.filter(theme => [...newThemes, 'volcanic', 'sunset', 'cyberpunk','street_art','starter_studio'].includes(theme.key) && !['gladiator', 'clear_ice'].includes(theme.key))) {
  for (const token of ['text', 'muted', 'accent']) {
    for (const surface of ['background', 'surface', 'raised']) {
      const values = [luminance(theme[token]), luminance(theme[surface])].sort((a, b) => b - a);
      assert((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${theme.key}: ${token} contrast on ${surface}`);
    }
  }
}
const gladiator = getWidgetColourTheme('gladiator');
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
assert(contrast(gladiator.text, gladiator.background) >= 4.5, 'Gladiator ivory text is readable on its dark background');
assert(contrast('#21130c', gladiator.raised) >= 4.5, 'Gladiator dark text is readable on antique gold');

const server = process.env.TEST_BASE_URL ? null : await createServer({logLevel:'silent',server:{host:'127.0.0.1',port:0,hmr:false}});
if(server) await server.listen();
const baseUrl = process.env.TEST_BASE_URL || server.resolvedUrls.local[0].replace(/\/$/,'');
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__widget-colour-themes') {
      await request.respond({ contentType: 'text/html', body: `<html><body style="margin:0;background:#242528;color:#fff"><div id="root"></div>
        <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>` });
    } else if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith('/api/')) await request.continue();
    else if (request.resourceType() === 'image') await request.respond({ contentType: 'image/webp', body: readFileSync(new URL('../public/player.webp', import.meta.url)) });
    else if (['data:', 'blob:'].includes(url.protocol)) await request.continue();
    else await request.abort();
  });
  await page.setViewport({ width: 1600, height: 1100 });
  await page.goto(`${baseUrl}/__widget-colour-themes`, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    const entry=await (await fetch('/src/main.jsx')).text();
    const reactUrl=entry.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1],version=reactUrl.split('?')[1];
    const { default: React } = await import(reactUrl);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?${version}`);
    const { BetterWidgetControls, ensureBetterWidgetConfig } = await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
    const { supabase } = await import('/src/config/supabaseClient.js');
    const originalRpc = supabase.rpc.bind(supabase);
    // This palette fixture has no restricted assets. Access/RLS has its own integration suite.
    supabase.rpc = (name, args) => name === 'get_overlay_asset_access'
      ? Promise.resolve({ data: [], error: null }) : originalRpc(name, args);
    const registry = await import('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
    const themes = await import('/src/components/OverlayCenter/editor/widgetColourThemes.js');
    const { WIDGET_COLOUR_THEMES } = await import('/src/components/OverlayCenter/widgets/shared/colourThemePalettes.js');
    const { switchChatStyle } = await import('/src/components/OverlayCenter/widgets/chat/chatStyles.js');
    const { resolveBonusHuntSyncedColors } = await import('/src/components/OverlayCenter/widgets/shared/bonusHuntColorSync.js');
    const routing = await import('/src/components/OverlayCenter/appearance/v2/appearanceRouting.js');
    const scopeUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith('/EditorControlScope.jsx'))?.name;
    const { EditorControlContext } = await import(scopeUrl);
    await import('/src/index.css');
    await import('/src/components/OverlayCenter/OverlayRenderer.css');
    await import('/src/components/OverlayCenter/editor/BetterWidgetPackages.css');
    const style = document.createElement('style');
    style.textContent = '[data-preview] *, [data-preview] *::before, [data-preview] *::after { animation:none!important;transition:none!important }';
    document.head.append(style);
    const root = ReactDOM.createRoot(document.getElementById('root'));
    window.themeTest = {
      ...themes, ...registry, routing, switchChatStyle, ensureBetterWidgetConfig, resolveBonusHuntSyncedColors,
      themes: WIDGET_COLOUR_THEMES.map(theme => theme.key),
      types: registry.getBetterWidgetTypes().filter(
        type => registry.getBetterWidgetDefinition(type)?.editor?.supportsColourTheme !== false,
      ),
      base(type) {
        const c = registry.resolveBetterWidgetConfig(type, registry.getBetterWidgetDefinition(type).defaultConfig, 'mock');
        return { ...c, twitchChannel: '', twitchEnabled: false, youtubeEnabled: false, kickEnabled: false,
          live: true, showNowPlaying: false, showCrypto: false, showSocials: false, showClock: false,
          bgMode: type === 'background' ? 'texture' : c.bgMode, textureType: type === 'background' ? 'grid' : c.textureType,
          __appearancePreviewMessages: [{ id: 'viewer', username: 'Stream Viewer', message: 'A readable chat message', avatarUrl: '/player.webp' }],
          animation: 'none', animations: false, __previewAlert: { raider_username: 'Streamer', raider_avatar_url: '/player.webp' },
          mediaText: '/player.webp|image|Live media', imageUrl: type === 'background' ? '/player.webp' : c.imageUrl,
        };
      },
      mount(type, config, { runtime = 'editor', controls = 'simple', width = 320, search = '', isAdmin = true } = {}) {
        const definition = registry.getBetterWidgetDefinition(type);
        const c = config || this.base(type);
        this.current = { type, config: c, runtime, controls, width, search, isAdmin };
        const instance = registry.normalizeBetterInstance(JSON.parse(JSON.stringify(registry.createBetterInstance(type, { config: c }))));
        this.instance = instance;
        root.render(React.createElement('main', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16, padding: 12 } },
          React.createElement('aside', { style: { width, flexShrink: 0 } },
            React.createElement(EditorControlContext.Provider, { value: { mode: controls, tab: '__all', search,
              simpleSections: definition.editor.simpleSections, sections: { 'Colour Theme': true }, onSection() {} } },
              React.createElement(BetterWidgetControls, { type, config: c, isAdmin, widget: { ...instance, config: c }, onChange: next => {
                window.themeTest.lastConfig = next;
                this.mount(type, next, { runtime, controls, width, search, isAdmin });
              } }))),
          React.createElement('div', { 'data-preview': type, style: { width: instance.width, height: instance.height, flexShrink: 0 } },
            registry.renderBetterWidgetInstance({ instance, layout: { instances: [instance] }, mode: 'live', runtime }))));
      },
      appearance() {
        const host = document.querySelector('[data-preview]');
        return [...host.querySelectorAll('*')].filter(el => el.getBoundingClientRect().width > 0).map(el => {
          const css = getComputedStyle(el);
          return [el.tagName, el.className?.baseVal ?? el.className, css.backgroundColor, css.backgroundImage, css.borderColor, css.color];
        });
      },
    };
  });
  const settle = () => page.evaluate(async() => {
    await new Promise(resolve => requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await Promise.all([...document.images].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})})));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  const mount = async (type, config, options) => {
    await page.evaluate(({ type, config, options }) => window.themeTest.mount(type, config, options), { type, config, options });
    await page.waitForSelector('.bp-theme-grid button');
    await settle();
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
    await settle();
  };
  const types = await page.evaluate(() => window.themeTest.types);
  const themes = await page.evaluate(() => window.themeTest.themes);
  await page.evaluate(() => window.themeTest.mount('chat', undefined, { isAdmin: false }));
  await page.waitForSelector('.bp-theme-grid button');
  assert.equal(await page.$('[data-colour-theme-key="clear_ice"]'), null, 'non-admin editor does not expose Clear Ice');
  assert.equal(types.length, 14);
  assert(types.includes('slot_requests'), 'Slot Requests participates in the palette regression matrix');
  const unit = await page.evaluate(() => {
    const t = window.themeTest, failures = [];
    const freeze = obj => { if (obj && typeof obj === 'object') { Object.freeze(obj); Object.values(obj).forEach(freeze); } return obj; };
    for (const type of t.types) {
      const original = freeze(t.base(type));
      const before = JSON.stringify(original);
      for (const theme of [...t.themes, 'gradient', 'matte']) {
        const patch = t.buildWidgetColourThemePatch(type, original, theme);
        if (!patch || !Object.keys(patch).length) failures.push(`${type}: missing palette mapping`);
        const applied = t.applyWidgetColourTheme(type, original, theme);
        if (JSON.stringify(original) !== before) failures.push(`${type}: mutated source`);
        for (const key of Object.keys(original)) if (!(key in patch) && key !== 'colourTheme') {
          if (JSON.stringify(original[key]) !== JSON.stringify(applied[key])) failures.push(`${type}: changed ${key}`);
        }
        const reloaded = t.normalizeBetterInstance(JSON.parse(JSON.stringify(t.createBetterInstance(type, { config: applied }))));
        if (t.getSelectedWidgetColourTheme(type, reloaded.config) !== theme) failures.push(`${type}: selection did not survive reload`);
      }
    }
    let chat = t.ensureBetterWidgetConfig('chat', { ...t.base('chat'), chatStyle: 'broadcast_chat' });
    chat = t.routing.setScopedAppearanceConfigValue(chat, { widgetType: 'chat', widgetVariant: 'broadcast_chat', elementId: 'messageText', propertyId: 'textColor' }, '#abcdef');
    chat = t.routing.setScopedAppearanceConfigValue(chat, { widgetType: 'chat', widgetVariant: 'broadcast_chat', elementId: 'messageText', propertyId: 'fontSize' }, 19);
    const changed = t.applyWidgetColourTheme('chat', chat, 'emerald');
    if (changed.__appearanceExplicitSubElements.messageText.textColor !== '#edfff7' || changed.__appearanceExplicitSubElements.messageText.fontSize !== 19) failures.push('Element colour update affected typography');
    if (t.routing.getScopedAppearanceConfigValue(changed, { widgetType: 'chat', widgetVariant: 'broadcast_chat', elementId: 'messageText', propertyId: 'textColor' }) !== '#edfff7') failures.push('Scoped colour did not update');
    let switched = t.switchChatStyle(changed, 'better_chat');
    switched = t.applyWidgetColourTheme('chat', switched, 'crimson');
    switched = t.switchChatStyle(switched, 'broadcast_chat');
    if (t.getSelectedWidgetColourTheme('chat', switched) !== 'emerald') failures.push('Chat styles leaked colour themes');
    if (t.getSelectedWidgetColourTheme('chat', { ...changed, text: '#fedcba' }) !== null) failures.push('Manual colours show a stale selected palette');
    if (t.getSelectedWidgetColourTheme('bets', { betTheme: 'crimson' }) !== 'crimson') failures.push('Legacy Bets theme selection');
    if (t.getSelectedWidgetColourTheme('bets', {}) !== 'neon') failures.push('Default Bets theme selection');
    const hunt = t.applyWidgetColourTheme('bonus_hunt', t.base('bonus_hunt'), 'emerald');
    for (const type of ['bets', 'chat', 'navbar']) {
      const linked = t.applyWidgetColourTheme(type, { ...t.base(type), bonusHuntColorSync: { enabled: true } }, 'crimson');
      if (!linked.bonusHuntColorSync.enabled) failures.push(`${type}: theme disabled linked colours`);
      const colors = t.resolveBonusHuntSyncedColors(linked, [{ widget_type: 'bonus_hunt', config: hunt }]);
      if (colors.primaryColor !== hunt.headerAccent || colors.secondaryColor !== hunt.headerColor) failures.push(`${type}: linked colours no longer follow the Hunt theme`);
    }
    const bingo = t.base('slot_bingo');
    if (bingo.squares.length !== 25 || bingo.squares[12].label !== 'FREE' || !bingo.squares[12].completed || !bingo.squares.every(square => Number.isFinite(square.multiplier))) failures.push('Slot Bingo default board');
    return failures;
  });
  assert.deepEqual(unit, []);
  for (const type of types) {
    const appearances = new Set();
    for (const theme of themes) {
      await mount(type);
      assert.equal(await page.$$eval('.bp-theme-grid button', buttons => buttons.length), themes.length, `${type}: all themes`);
      await page.evaluate(theme => [...document.querySelectorAll('.bp-theme-grid button')].find(button => button.dataset.colourThemeKey === theme).click(), theme);
      await settle();
      const result = await page.evaluate(() => ({ config: window.themeTest.lastConfig, style: window.themeTest.appearance(), selected: document.querySelector('.bp-theme-grid [aria-pressed="true"]')?.dataset.colourThemeKey }));
      assert.equal(result.selected, theme, `${type}: selected theme`);
      assert(result.style.length > 0, `${type}: blank preview`);
      if (type === 'bonus_hunt' && theme === 'clear_ice') {
        const statMaterial = await page.$eval('.better-widget-colour-scope[data-colour-theme="clear_ice"] .better-hunt-stat', element => {
          const style = getComputedStyle(element);
          const text = getComputedStyle(element.querySelector('span'));
          return { image: style.backgroundImage, color: text.color, stroke: text.webkitTextStrokeWidth };
        });
        assert.match(statMaterial.image, /linear-gradient\(rgb\(10, 43, 74\), rgb\(18, 50, 84\)\)/, 'Clear Ice hunt stats use the same deep glass fill as the on-canvas giveaway fields');
        assert.equal(statMaterial.color, 'rgb(255, 255, 255)', 'Clear Ice hunt stat text is white');
        assert.notEqual(statMaterial.stroke, '0px', 'Clear Ice hunt stat text has a black outline');
        const texture = await page.$eval('.better-widget-colour-scope[data-colour-theme="clear_ice"] .better-hunt-stat', element => {
          const overlay = getComputedStyle(element, '::after');
          return { image: overlay.backgroundImage, blend: overlay.mixBlendMode, opacity: Number(overlay.opacity) };
        });
        assert.match(texture.image, /clear-ice-fractures\.png/, 'Clear Ice Bonus Hunt cards render the original alpha fracture texture');
        assert.equal(texture.blend, 'screen', 'Clear Ice texture is blended as a highlight overlay');
        assert(texture.opacity > 0 && texture.opacity <= 0.25, 'Clear Ice texture stays subtle and preserves readability');
      }
      if (theme === 'gladiator') {
        const typography = await page.$$eval(
          '.better-widget-colour-scope[data-colour-theme="gladiator"] *:not(svg):not(path)',
          elements => elements
            .filter(element => [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()))
            .filter(element => {
              const bounds = element.getBoundingClientRect();
              return bounds.width > 0 && bounds.height > 0;
            })
            .map(element => getComputedStyle(element).color),
        );
        assert(typography.length > 0 || ['background', 'slideshow_frame'].includes(type), `${type}: Gladiator has rendered typography`);
        const allowed = new Set(['rgb(33, 19, 12)', 'rgb(244, 227, 186)']);
        assert(typography.every(color => allowed.has(color)), `${type}: Gladiator typography uses contextual dark or ivory text`);
      }
      if (type === 'bets') assert.equal(await page.$eval('.better-bets-stage', stage => stage.dataset.theme), theme, `${theme}: Bets must not fall back to Neon`);
      appearances.add(JSON.stringify(result.style));
      await mount(type, result.config);
      assert.deepEqual(await page.evaluate(() => window.themeTest.appearance()), result.style, `${type}/${theme}: reload matches preview`);
      if (!['raid_shoutout', 'connect_four'].includes(type)) {
        await mount(type, result.config, { runtime: 'obs' });
        assert.deepEqual(await page.evaluate(() => window.themeTest.appearance()), result.style, `${type}/${theme}: OBS matches editor`);
      }
    }
    assert.equal(appearances.size, themes.length, `${type}: each theme visibly changes the renderer`);
    await mount(type, undefined, { controls: 'advanced', width: 220 });
    assert.equal(await page.$$eval('.bp-theme-grid button', buttons => buttons.length), themes.length, `${type}: advanced controls`);
    assert.equal(await page.$eval('.bp-theme-grid', grid => grid.scrollWidth <= grid.clientWidth + 1 && [...grid.querySelectorAll('button')].every(button => button.scrollWidth <= button.clientWidth + 1)), true, `${type}: narrow controls fit`);
    console.log(`${type}: all ${themes.length} themes, reload and available runtime rendering passed`);
  }
  const oldRomeRtp = await page.evaluate(() => window.themeTest.applyWidgetColourTheme(
    'rtp_stats',
    {
      ...window.themeTest.base('rtp_stats'),
      previewMode: true,
      providerMode: 'image',
      providerLogoUrl: '/player.webp',
      __appearanceExplicitSubElements: {
        provider: { imageUrl: '/player.webp' },
      },
    },
    'old_rome',
  ));
  await mount('rtp_stats', oldRomeRtp);
  const oldRomeProviderLogo = await page.$eval('[data-better-element="provider"] > img, .rtp-stats-provider-logo', image => {
    const imageStyle = getComputedStyle(image);
    const wrapperStyle = getComputedStyle(image.closest('[data-better-element="provider"], .rtp-stats-provider--logo'));
    return {
      imageFilter: imageStyle.filter,
      imageBlend: imageStyle.mixBlendMode,
      wrapperFilter: wrapperStyle.filter,
      wrapperBlend: wrapperStyle.mixBlendMode,
    };
  });
  assert.match(oldRomeProviderLogo.imageFilter, /brightness\(0\)/, 'Old Rome provider image is rendered as black ink');
  assert.match(oldRomeProviderLogo.wrapperFilter, /brightness\(0\)/, 'Old Rome provider mark enforces the black treatment');
  assert.equal(oldRomeProviderLogo.imageBlend, 'multiply');
  assert.equal(oldRomeProviderLogo.wrapperBlend, 'multiply');
  for (const theme of ['gradient', 'matte']) {
    const legacy = await page.evaluate(theme => window.themeTest.applyWidgetColourTheme('bets', window.themeTest.base('bets'), theme), theme);
    await mount('bets', legacy, { runtime: 'obs' });
    assert.equal(await page.$eval('.better-bets-stage', stage => stage.dataset.theme), theme, `${theme}: legacy Bets rendering`);
    assert.equal(await page.$('.bp-theme-grid [aria-pressed="true"]'), null, `${theme}: retired palette must not select a replacement`);
  }
  await mount('chat', { ...(await page.evaluate(() => window.themeTest.base('chat'))), chatStyle: 'broadcast_chat' }, { search: 'emerald' });
  assert.equal(await page.$$eval('.bp-theme-grid button', buttons => buttons.length), themes.length, 'Theme search');
  if (process.env.TEST_SCREENSHOT_PATH) {
    await mount('bets', await page.evaluate(() => window.themeTest.applyWidgetColourTheme('bets', window.themeTest.base('bets'), 'cyberpunk')));
    await page.screenshot({ path: process.env.TEST_SCREENSHOT_PATH });
  }
  assert.deepEqual(errors, []);
  console.log(`All widget colour themes passed: ${types.length * themes.length} palette combinations, readable new palettes, isolated configuration, responsive controls, reload and editor/OBS parity.`);
} finally {
  await browser.close();
  await server?.close();
}
