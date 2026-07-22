import assert from 'node:assert/strict';
import { createServer } from 'vite';

function read(path, source) {
  return path.split('.').reduce((cursor, key) => cursor?.[key], source);
}

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

const {
  applyWidgetStylePack,
  createWidgetStylePack,
} = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/widgetStyleTransfer.js');

const sourceAppearance = {
  widgets: {
    source_navbar: {
      activeStyleId: 'v1',
      appearanceV2: {
        elementOverrides: {
          displayName: {
            fontSize: 24,
            width: 220,
            height: 42,
          },
        },
      },
    },
  },
};

const sourceWidgets = [
  {
    id: 'source_navbar',
    widget_type: 'navbar',
    config: {
      displayStyle: 'v1',
      streamerName: 'Source Streamer',
      channelName: 'source-channel',
      apiKey: 'source-secret',
      fontFamily: 'Rajdhani',
      fontSize: 18,
      widgetWidth: 1920,
      widgetHeight: 72,
      width: 960,
      height: 80,
      ctaColor: '#78f4ff',
    },
  },
];

const targetWidgets = [
  {
    id: 'target_navbar',
    widget_type: 'navbar',
    config: {
      displayStyle: 'v1',
      streamerName: 'Target Streamer',
    },
  },
];

const pack = createWidgetStylePack({
  appearance: sourceAppearance,
  widgets: sourceWidgets,
  exportedAt: '2026-07-22T00:00:00.000Z',
});

const exportedVisual = read('widgets.0.style.styles.v1.visual', pack);
assert.equal(exportedVisual.fontFamily, 'Rajdhani');
assert.equal(exportedVisual.fontSize, 18);
assert.equal(exportedVisual.widgetWidth, 1920);
assert.equal(exportedVisual.widgetHeight, 72);
assert.equal(exportedVisual.width, 960);
assert.equal(exportedVisual.height, 80);
assert.equal(exportedVisual.ctaColor, '#78f4ff');

const serializedPack = JSON.stringify(pack);
assert.equal(serializedPack.includes('Source Streamer'), false);
assert.equal(serializedPack.includes('source-channel'), false);
assert.equal(serializedPack.includes('source-secret'), false);

const imported = applyWidgetStylePack({
  appearance: {},
  widgets: targetWidgets,
  pack,
});

assert.equal(imported.error, '');
assert.equal(imported.applied, 1);
assert.equal(read('widgets.target_navbar.activeStyleId', imported.appearance), 'v1');
assert.equal(read('widgets.target_navbar.styles.v1.visual.fontSize', imported.appearance), 18);
assert.equal(read('widgets.target_navbar.styles.v1.visual.widgetWidth', imported.appearance), 1920);
assert.equal(read('widgets.target_navbar.styles.v1.visual.widgetHeight', imported.appearance), 72);
assert.equal(read('widgets.target_navbar.styles.v1.visual.width', imported.appearance), 960);
assert.equal(read('widgets.target_navbar.styles.v1.visual.height', imported.appearance), 80);
assert.equal(read('widgets.target_navbar.styles.v1.visual.ctaColor', imported.appearance), '#78f4ff');
assert.equal(read('widgets.target_navbar.appearanceV2.elementOverrides.displayName.fontSize', imported.appearance), 24);
assert.equal(read('widgets.target_navbar.appearanceV2.elementOverrides.displayName.width', imported.appearance), 220);
assert.equal(read('widgets.target_navbar.appearanceV2.elementOverrides.displayName.height', imported.appearance), 42);

console.log('widget style transfer keeps styling sizes and font sizes');

await server.close();
