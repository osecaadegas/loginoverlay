import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./overlay.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(source => source.trim());
assert.ok(scripts.length > 0, 'overlay must contain an inline application script');
for (const source of scripts) new Function(source);
console.log(`PASS: ${scripts.length} inline overlay script block(s) parse`);
