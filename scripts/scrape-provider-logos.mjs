// Scrape provider logo URLs from depositwin777.com
// Cross-references two JS chunks to map provider slugs to their actual image URLs

const BASE = 'https://www.depositwin777.com';
const PROVIDERS_CHUNK = `${BASE}/assets/js/1.9.23-Bd_AdTq9-chunk.js`;
const ASSETS_CHUNK = `${BASE}/assets/js/1.9.23-b4T3w6rh-chunk.js`;

async function main() {
  console.log('Fetching chunks...');
  const [providersJs, assetsJs] = await Promise.all([
    fetch(PROVIDERS_CHUNK).then(r => r.text()),
    fetch(ASSETS_CHUNK).then(r => r.text()),
  ]);

  // 1) From assets chunk: extract export mapping (internalVar as exportName)
  const exportMatch = assetsJs.match(/export\{(.+)\}/);
  if (!exportMatch) { console.error('No export block found'); return; }
  
  const exportMap = {}; // exportName -> internalVarName
  for (const pair of exportMatch[1].split(',')) {
    const m = pair.trim().match(/^(.+?)\s+as\s+(.+)$/);
    if (m) {
      exportMap[m[2].trim()] = m[1].trim();
    }
  }

  // 2) From assets chunk: extract variable assignments (const/let x = "value")
  //    Handles both data URIs and path strings
  const varValues = {}; // internalVar -> value
  
  // Match: const X="...", or ,X="..." patterns
  // The file uses const declarations with destructuring: const G="data:...",j="/assets/...",o="..."
  const constBlocks = assetsJs.matchAll(/(?:const |,)([A-Za-z0-9_$]+)\s*=\s*"((?:[^"\\]|\\.)*)"/g);
  for (const m of constBlocks) {
    varValues[m[1]] = m[2];
  }

  // 3) From providers chunk: extract provider slug -> import variable name mapping
  //    Pattern: "/src/assets/providers/_slug.png": importedVarName
  const providerMap = {}; // slug -> exportName (from the import)
  const providerMatches = providersJs.matchAll(/\/src\/assets\/providers\/_([^"]+)\.png":\s*([A-Za-z0-9_$]+)/g);
  for (const m of providerMatches) {
    providerMap[m[1]] = m[2];
  }

  // 4) Resolve: slug -> exportName -> internalVar -> value
  const results = [];
  for (const [slug, exportName] of Object.entries(providerMap)) {
    const internalVar = exportMap[exportName];
    let url = internalVar ? varValues[internalVar] : undefined;
    
    if (!url) {
      // Might be a direct variable name (not re-exported)
      url = varValues[exportName];
    }
    
    if (url) {
      // Convert relative paths to full URLs
      if (url.startsWith('/assets/')) {
        url = `${BASE}${url}`;
      }
      // data URIs stay as-is
      results.push({ slug, url: url.startsWith('data:') ? `DATA_URI(${slug})` : url });
    } else {
      results.push({ slug, url: null });
    }
  }

  console.log(`\nFound ${Object.keys(providerMap).length} providers`);
  console.log(`Resolved ${results.filter(r => r.url).length} URLs\n`);

  // Print results
  for (const r of results.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`${r.slug}: ${r.url || 'MISSING'}`);
  }

  // Output JSON for further processing
  const fs = await import('fs');
  fs.writeFileSync('scripts/provider-logos.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to scripts/provider-logos.json');
}

main().catch(console.error);
