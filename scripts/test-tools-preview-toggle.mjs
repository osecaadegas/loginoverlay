import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/OverlayCenter/OverlayControlCenter.jsx', import.meta.url), 'utf8');

const toggleMarker = 'data-action="toggle-tools-inline-preview"';
const toggleMarkerIndex = source.indexOf(toggleMarker);
assert.notEqual(toggleMarkerIndex, -1, 'tools page exposes a dedicated inline preview toggle button');

const toggleStart = source.lastIndexOf('<button', toggleMarkerIndex);
const toggleEnd = source.indexOf('</button>', toggleMarkerIndex);
assert.ok(toggleStart !== -1 && toggleEnd !== -1, 'preview toggle button markup is complete');
const toggleButton = source.slice(toggleStart, toggleEnd);
assert.ok(/type="button"/.test(toggleButton), 'preview toggle is a button, not an implicit submit/navigation control');
assert.ok(/onClick=\{toggleInlinePreview\}/.test(toggleButton), 'preview toggle uses the inline toggle handler');
assert.ok(/onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/.test(toggleButton), 'preview toggle blocks parent pointer bubbling');
assert.ok(/aria-expanded=\{expanded\}/.test(toggleButton), 'preview toggle exposes expanded state');
assert.ok(/aria-controls="oc2-tools-inline-preview"/.test(toggleButton), 'preview toggle points to the inline preview panel');

assert.ok(/function ToolsLivePreviewDock\(/.test(source), 'tools preview uses the isolated preview dock component');
assert.ok(/function PreviewToolRailCard\(/.test(source), 'preview side tools use lightweight non-navigating rail cards');
assert.ok(/previewActive,\s*\n\s*onPreviewToggle,/.test(source), 'ToolWorkspace receives controlled preview state');
assert.ok(/onToggle\(\)/.test(source), 'toggle handler delegates state changes to the page shell');
assert.ok(/const \[toolsPreviewExpanded, setToolsPreviewExpanded\] = useState\(false\)/.test(source), 'Overlay page owns tools preview state');
assert.ok(/previewActive=\{toolsPreviewExpanded\}/.test(source), 'Tools page passes preview state into ToolWorkspace');
assert.ok(/onPreviewToggle=\{\(\) => setToolsPreviewExpanded\(active => !active\)\}/.test(source), 'Tools page flips preview state with a functional update');
assert.ok(/className="oc2-tools-preview-dock__stage"/.test(source), 'expanded preview renders the rebuilt dock stage');
assert.ok(/<iframe[\s\S]*?title="Overlay live preview"[\s\S]*?src=\{previewUrl\}[\s\S]*?\/>/.test(source), 'expanded preview renders inline iframe');
assert.ok(!/oc2-tool-preview-layout/.test(source), 'old preview layout is not rendered anymore');

const toggleHandlerMatch = source.match(/const toggleInlinePreview = \(event\) => \{[\s\S]*?\n\s*\};/);
assert.ok(toggleHandlerMatch, 'inline preview toggle handler exists');
assert.ok(/preventDefault\(\)/.test(toggleHandlerMatch[0]), 'toggle handler prevents default navigation');
assert.ok(/stopPropagation\(\)/.test(toggleHandlerMatch[0]), 'toggle handler stops click bubbling');
assert.ok(!/window\.open/.test(toggleHandlerMatch[0]), 'inline preview toggle does not open a pop-up window');

console.log('Tools preview toggle audit passed.');
