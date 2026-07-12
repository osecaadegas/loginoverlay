import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const summaryOnly = process.argv.includes('--summary');

const TARGETS = [
  'src/components/OverlayCenter/widgets',
  'src/components/OverlayCenter/OverlayRenderer.jsx',
  'src/components/OverlayCenter/OverlayPreview.jsx',
  'src/components/OverlayCenter/themeVarsBuilder.js',
  'src/components/OverlayCenter/appearance',
];

const IGNORE_FILE = /(?:Config\.jsx|\.bak$|AvatarThumbnail\.jsx|ColorPicker\.jsx|TabBar\.jsx)$/;
const VISUAL_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b\d+(?:\.\d+)?(?:px|rem)\b|(?:linear|radial|conic)-gradient\([^)]*\)|['"`]\s*(?:Inter|Roboto|Arial|Segoe UI|sans-serif|serif|monospace)[^'"`]*['"`]/gi;
const NUMERIC_APPEARANCE_PROP = /\b(?:fontSize|borderRadius|borderWidth|padding|gap|width|height|minWidth|maxWidth|minHeight|maxHeight|lineHeight|letterSpacing|opacity|shadowBlur|shadowSize|shadowIntensity|imageSize|iconSize|barHeight)\s*:\s*\d+(?:\.\d+)?\b/gi;
const SHADOW_LITERAL_PROP = /\b(?:boxShadow|textShadow|filter)\s*:\s*['"`][^'"`]*(?:\d+px|drop-shadow|blur\(|rgba?\()[^'"`]*['"`]/gi;
const TAILWIND_VISUAL_CLASS = /className\s*=\s*["'`][^"'`]*(?:\bbg-|\btext-|\bborder-|\brounded-|\bshadow-|\bp-|\bpx-|\bpy-|\bgap-|\bw-|\bh-)/i;

function walk(entry) {
  const full = path.join(root, entry);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return [full];
  return fs.readdirSync(full).flatMap(child => walk(path.join(entry, child)));
}

function toRepoPath(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function getWidgetFromPath(file) {
  const base = path.basename(file).replace(/\.(jsx|js|css)$/i, '');
  return base.replace(/Widget$/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2') || 'Overlay';
}

function classify({ file, line }) {
  const text = line.trim();
  if (/appearanceModel\.js|themeVarsBuilder\.js|AppearanceCenter\.jsx/.test(file)) return 'global-customisable';
  if (/var\(--|subValue\(|subElement|buildWidgetAppearanceVars|buildScopedAppearanceVars/.test(text)) return 'element-customisable';
  if (/states?\.|openedState|unopenedState|winningState|losingState|selectedState|pendingState|completedState|rejectedState/.test(text)) return 'state-customisable';
  if (/position\s*:|left\s*:|top\s*:|zIndex\s*:|display\s*:|overflow\s*:|transform\s*:|transformOrigin\s*:|aspectRatio\s*:|width\s*:\s*'100%'|height\s*:\s*'100%'/.test(text)) return 'structural';
  if (/styleConfigKey|displayStyle|layout|chatStyle/.test(text)) return 'style-customisable';
  if (/widget\.width|widget\.height|position_x|position_y/.test(text)) return 'instance-customisable';
  if (/fallback|default|preset|THEME_PRESETS|PALETTE|COLORS/.test(text)) return 'widget-type-customisable';
  return 'element-customisable';
}

function replacementFor(classification) {
  if (classification === 'structural') return 'Document as structural in audit report.';
  if (classification === 'global-customisable') return 'Store under SYSTEM_APPEARANCE/theme/global tokens.';
  if (classification === 'widget-type-customisable') return 'Move to widgetTypes[type].appearance or widget definition defaults.';
  if (classification === 'style-customisable') return 'Move to widgetTypes[type].styles[styleId] or widgets[id].styles[styleId].';
  if (classification === 'instance-customisable') return 'Move to widgets[id].appearance or widget layout row if positional.';
  if (classification === 'state-customisable') return 'Move to subElements[elementId].states[stateId].';
  if (classification === 'responsive-customisable') return 'Move to responsive.overrides matching viewport constraints.';
  return 'Move to subElements[elementId] tokens and render via subValue/CSS vars.';
}

const files = TARGETS.flatMap(walk)
  .filter(file => /\.(jsx|js|css)$/i.test(file))
  .filter(file => !IGNORE_FILE.test(path.basename(file)));

const findings = [];
for (const file of files) {
  const repoPath = toRepoPath(file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const values = [
      ...line.matchAll(VISUAL_LITERAL),
      ...line.matchAll(NUMERIC_APPEARANCE_PROP),
      ...line.matchAll(SHADOW_LITERAL_PROP),
    ].map(match => match[0]);
    const hasTailwindVisual = TAILWIND_VISUAL_CLASS.test(line);
    if (!values.length && !hasTailwindVisual) return;
    const classification = classify({ file: repoPath, line });
    findings.push({
      file: repoPath,
      line: index + 1,
      component: path.basename(file),
      widget: getWidgetFromPath(file),
      property: hasTailwindVisual ? 'tailwind visual class' : values[0].split(':')[0],
      value: hasTailwindVisual ? line.trim().slice(0, 140) : values.slice(0, 4).join(', '),
      classification,
      replacement: replacementFor(classification),
      risk: classification === 'structural' ? 'low' : /Renderer|Preview|appearanceModel/.test(repoPath) ? 'medium' : 'high',
      testStatus: classification === 'structural' ? 'documented' : 'requires token path or existing resolver coverage',
    });
  });
}

const counts = findings.reduce((acc, finding) => {
  acc[finding.classification] = (acc[finding.classification] || 0) + 1;
  return acc;
}, {});

const report = {
  scannedFiles: files.length,
  findingCount: findings.length,
  counts,
  findings,
};

console.log(JSON.stringify(summaryOnly ? {
  scannedFiles: report.scannedFiles,
  findingCount: report.findingCount,
  counts: report.counts,
} : report, null, 2));

const prohibited = findings.filter(finding => finding.classification !== 'structural');
if (strict && prohibited.length > 0) {
  console.error(`Found ${prohibited.length} non-structural hardcoded appearance values.`);
  process.exit(1);
}