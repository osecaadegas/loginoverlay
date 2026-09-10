import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

globalThis.window = { location: { origin: 'http://localhost' } };
const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BETTER_WIDGETS, BetterWidgetControls } = await server.ssrLoadModule('/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx');
  const { EditorControlContext, controlSearchText } = await server.ssrLoadModule('/src/components/OverlayCenter/editor/EditorControlScope.jsx');
  const { EDITOR_WIDGET_METADATA } = await server.ssrLoadModule('/src/components/OverlayCenter/editor/editorWidgetMetadata.js');
  const sectionsIn = (markup) => [...markup.matchAll(/data-control-section="([^"]+)"/g)].map((match) => match[1]);
  for (const definition of BETTER_WIDGETS) {
    const render = (scope) => renderToStaticMarkup(createElement(EditorControlContext.Provider, { value: {
      simpleSections: EDITOR_WIDGET_METADATA[definition.type].simpleSections,
      sections: {}, onSection() {}, onTab() {}, ...scope,
    } }, createElement(BetterWidgetControls, {
      type: definition.type, config: definition.defaultConfig, onChange() {}, onWidgetChange() {},
      widget: { id: `test-${definition.type}`, widget_type: definition.type, ...definition.defaultSize, config: definition.defaultConfig },
    })));
    const simple = render({ mode: 'simple', search: '' });
    const all = render({ mode: 'advanced', tab: '__all', search: '' });
    const simpleSections = sectionsIn(simple);
    const allSections = sectionsIn(all);
    assert.ok(simpleSections.length > 0, `${definition.type} has usable Simple controls`);
    assert.ok(allSections.length >= simpleSections.length, `${definition.type} retains all sections in Advanced`);
    assert.ok(!simple.includes('role="tablist"'), `${definition.type} Simple has no nested category navigation`);
    for (const title of simpleSections) assert.ok(allSections.includes(title), `${definition.type}: ${title} remains in Advanced`);
    const distinctTitles = [...new Set(allSections)];
    for (const title of distinctTitles) {
      const decoded = title.replaceAll('&amp;', '&').replaceAll('&#x27;', "'").replaceAll('&quot;', '"');
      const results = render({ mode: 'simple', search: decoded });
      assert.ok(sectionsIn(results).includes(title), `${definition.type}: search reaches ${title}`);
      assert.ok(results.includes('aria-expanded="true"'), 'Search opens matching sections');
    }
    assert.equal(sectionsIn(render({ mode: 'simple', search: 'no-such-setting-123' })).length, 0);
    console.log(`${definition.type}: ${simpleSections.length} Simple sections, ${distinctTitles.length} searchable sections`);
  }
  assert.match(controlSearchText(createElement('label', { title: 'RTP', options: [{ label: 'Provider' }] }, createElement('span', null, 'Colour'))), /RTP.*Provider.*Colour/);
  const { readEditorPreferences, writeEditorPreferences } = await server.ssrLoadModule('/src/components/OverlayCenter/editor/editorPreferences.js');
  const cache = new Map();
  globalThis.localStorage = { getItem: (key) => cache.get(key), setItem: (key, value) => cache.set(key, value) };
  writeEditorPreferences('user-a', 'build-a', { zoom: 1, widgets: { 'hunt-a': { mode: 'advanced' } } });
  assert.equal(readEditorPreferences('user-a', 'build-a').widgets['hunt-a'].mode, 'advanced');
  assert.deepEqual(readEditorPreferences('user-b', 'build-a'), {}, 'Preferences do not leak across accounts');
  assert.deepEqual(readEditorPreferences('user-a', 'build-b'), {}, 'Preferences do not leak across builds');
  cache.set('better-editor-ui:user-a:build-a', 'invalid JSON');
  assert.deepEqual(readEditorPreferences('user-a', 'build-a'), {}, 'Malformed local cache does not break editing');
  globalThis.localStorage = { getItem() { throw new Error('Storage disabled'); }, setItem() { throw new Error('Storage disabled'); } };
  assert.deepEqual(readEditorPreferences('user-a', 'build-a'), {});
  assert.doesNotThrow(() => writeEditorPreferences('user-a', 'build-a', { zoom: 1 }));
  console.log('Editor control scope checks passed for all widget types.');
} finally { await server.close(); }
