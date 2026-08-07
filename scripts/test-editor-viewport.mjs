import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editorSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/editor/WidgetEditorPage.jsx",
    import.meta.url,
  ),
  "utf8",
);
const editorCss = readFileSync(
  new URL(
    "../src/components/OverlayCenter/editor/WidgetEditorPage.css",
    import.meta.url,
  ),
  "utf8",
);

assert.ok(
  editorSource.includes("useCanvasScale(shellRef, zoom, !loading && !error)") &&
    editorSource.includes("if (!ready || !shell) return undefined;") &&
    editorSource.includes("availableWidth / BETTER_CANVAS.width") &&
    editorSource.includes("availableHeight / BETTER_CANVAS.height"),
  "Canvas fitting starts after loading and uses the complete shell area",
);
assert.ok(
  editorSource.includes('document.documentElement.classList.add("better-editor-document")') &&
    editorSource.includes('document.body.classList.add("better-editor-document")'),
  "The editor locks document scrolling while mounted",
);
assert.match(
  editorCss,
  /\.better-editor-page\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?overflow:\s*hidden;/,
  "The editor workspace is fixed to the dynamic viewport",
);
assert.ok(
  editorSource.includes('<footer className="better-editor-footer">') &&
    /grid-template-rows:\s*minmax\(0, 1fr\) 26px;/.test(editorCss) &&
    /\.better-editor-footer\s*\{[\s\S]*?grid-column:\s*1 \/ -1;[\s\S]*?grid-row:\s*2;[\s\S]*?z-index:\s*100;/.test(
      editorCss,
    ) &&
    /\.better-editor-stage\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?grid-row:\s*1;/.test(
      editorCss,
    ),
  "A thin footer owns the visible second row above the editor panels",
);
assert.match(
  editorCss,
  /\.better-editor-canvas-shell\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?padding:\s*0;/,
  "The preview fills its grid cell without an internally scrolling gutter",
);
assert.match(
  editorCss,
  /\.better-editor-widget-list,[\s\S]*?\.better-editor-settings-scroll\s*\{[\s\S]*?overflow-y:\s*auto;/,
  "Only the side menu content areas scroll vertically",
);
assert.match(
  editorCss,
  /\.better-editor-settings-scroll\s*>\s*\*\s*\{[\s\S]*?flex:\s*0 0 auto;/,
  "Settings controls retain their height and overflow inside the side menu",
);
assert.ok(
  !editorCss.includes("flex-direction: column;\n    overflow: auto;"),
  "Responsive editor layouts do not restore page scrolling",
);

console.log("Editor viewport and canvas-fit checks passed.");
