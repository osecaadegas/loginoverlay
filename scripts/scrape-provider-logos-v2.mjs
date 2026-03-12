// Full provider logo URL scraper
// Chain: providers chunk import mapping -> assets chunk exports -> variable values

const BASE = 'https://www.depositwin777.com';
const PROVIDERS_CHUNK = `${BASE}/assets/js/1.9.23-Bd_AdTq9-chunk.js`;
const ASSETS_CHUNK = `${BASE}/assets/js/1.9.23-b4T3w6rh-chunk.js`;

async function main() {
  console.log('Fetching chunks...');
  const [providersJs, assetsJs] = await Promise.all([
    fetch(PROVIDERS_CHUNK).then(r => r.text()),
    fetch(ASSETS_CHUNK).then(r => r.text()),
  ]);

  // 1) Parse the import line in providers chunk that imports from assets chunk
  //    Pattern: import{ _ as C, a as P, b as S, ... } from "./1.9.23-b4T3w6rh-chunk.js"
  const importMatch = providersJs.match(
    /import\s*\{([^}]+)\}\s*from\s*["']\.\/1\.9\.23-b4T3w6rh-chunk\.js["']/
  );
  if (!importMatch) { console.error('Import line not found'); return; }

  // Build: localName (in providers chunk) -> exportName (from assets chunk)
  const localToExport = {};
  for (const pair of importMatch[1].split(',')) {
    const m = pair.trim().match(/^(.+?)\s+as\s+(.+)$/);
    if (m) {
      localToExport[m[2].trim()] = m[1].trim(); // local = m[2], export = m[1]
    }
  }
  console.log(`Import map: ${Object.keys(localToExport).length} pairs`);

  // 2) Parse export block in assets chunk: internalVar as exportName
  const exportMatch = assetsJs.match(/export\{(.+)\}/);
  if (!exportMatch) { console.error('No export block found'); return; }

  const exportToInternal = {};
  for (const pair of exportMatch[1].split(',')) {
    const m = pair.trim().match(/^(.+?)\s+as\s+(.+)$/);
    if (m) {
      exportToInternal[m[2].trim()] = m[1].trim();
    }
  }
  console.log(`Export map: ${Object.keys(exportToInternal).length} pairs`);

  // 3) Extract ALL string variable assignments from assets chunk
  //    This is a minified file so variables are declared like: const G="data:...",j="/assets/..."
  //    We need to handle data URIs and path strings
  const varValues = {};

  // Strategy: find all string assignments using a more robust approach
  // Look for patterns like: identifierName="stringValue"
  // The string values can be very long (data URIs)
  const assignRe = /(?:^|[,;{}()\s])([A-Za-z_$][A-Za-z0-9_$]*)="((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = assignRe.exec(assetsJs)) !== null) {
    varValues[m[1]] = m[2];
  }
  console.log(`Variable values: ${Object.keys(varValues).length} found`);

  // 4) Extract provider slug -> local variable name from providers chunk
  const providerToLocal = {};
  const provRe = /\/src\/assets\/providers\/_([^"]+)\.png"\s*:\s*([A-Za-z0-9_$]+)/g;
  while ((m = provRe.exec(providersJs)) !== null) {
    providerToLocal[m[1]] = m[2];
  }
  console.log(`Provider mappings: ${Object.keys(providerToLocal).length} found`);

  // 5) Resolve the full chain: slug -> localVar -> exportName -> internalVar -> value
  const results = [];
  let resolved = 0, dataUri = 0, missing = 0;

  for (const [slug, localVar] of Object.entries(providerToLocal)) {
    const exportName = localToExport[localVar];
    const internalVar = exportName ? exportToInternal[exportName] : undefined;
    let url = internalVar ? varValues[internalVar] : undefined;

    if (url) {
      if (url.startsWith('data:')) {
        dataUri++;
        results.push({ slug, url: url, type: 'data_uri' });
      } else if (url.startsWith('/assets/')) {
        resolved++;
        results.push({ slug, url: `${BASE}${url}`, type: 'url' });
      } else {
        resolved++;
        results.push({ slug, url, type: 'other' });
      }
    } else {
      missing++;
      // Debug chain for first few missing
      if (missing <= 3) {
        console.log(`\nDEBUG missing: ${slug}`);
        console.log(`  localVar: ${localVar}`);
        console.log(`  exportName: ${exportName || 'NOT FOUND'}`);
        console.log(`  internalVar: ${internalVar || 'NOT FOUND'}`);
      }
      results.push({ slug, url: null, type: 'missing' });
    }
  }

  console.log(`\nResults: ${resolved} URLs, ${dataUri} data URIs, ${missing} missing`);

  // Sort and output
  results.sort((a, b) => a.slug.localeCompare(b.slug));
  for (const r of results) {
    if (r.type === 'url') {
      console.log(`${r.slug}: ${r.url}`);
    } else if (r.type === 'data_uri') {
      console.log(`${r.slug}: [DATA_URI ${r.url.length} chars]`);
    } else {
      console.log(`${r.slug}: MISSING`);
    }
  }

  // Save full results
  const fs = await import('fs');
  fs.writeFileSync('scripts/provider-logos.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to scripts/provider-logos.json');
}

main().catch(console.error);
