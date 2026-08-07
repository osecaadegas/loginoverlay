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
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8",
);
const appCss = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");

assert.ok(
  editorSource.includes("useCanvasScale(shellRef, !loading && !error)") &&
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
assert.ok(
  appSource.includes('isEditorRoute ? " app-layout--editor" : ""') &&
    appSource.includes('isEditorRoute ? " main-content--editor" : ""') &&
    /\.app-layout--editor\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?overflow:\s*hidden;/.test(
      appCss,
    ) &&
    /\.main-content\.main-content--editor\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/.test(
      appCss,
    ),
  "The editor route fills only the viewport space below global navigation",
);
assert.match(
  editorCss,
  /\.better-editor-page\s*\{[\s\S]*?height:\s*100%;[\s\S]*?overflow:\s*hidden;/,
  "The editor workspace fills its viewport-bounded application shell",
);
assert.ok(
  !editorSource.includes('className="better-editor-canvas-tools"') &&
    /\.better-editor-stage\s*\{[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\);/.test(
      editorCss,
    ),
  "The canvas begins immediately below the primary editor toolbar",
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
