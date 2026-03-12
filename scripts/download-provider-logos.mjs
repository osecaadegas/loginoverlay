// Download all provider logos and save to public/providers/
// Then generate SQL migration

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUT_DIR = 'public/providers';
const results = JSON.parse(readFileSync('scripts/provider-logos.json', 'utf-8'));

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  let saved = 0, failed = 0;
  const sqlLines = [];

  for (const { slug, url, type } of results) {
    const filename = `${slug}.png`;
    const filepath = join(OUT_DIR, filename);

    try {
      if (type === 'data_uri' && url) {
        // Decode base64 data URI
        const base64 = url.replace(/^data:image\/png;base64,/, '');
        const buf = Buffer.from(base64, 'base64');
        writeFileSync(filepath, buf);
        saved++;
      } else if (type === 'url' && url) {
        // Download from URL
        const res = await fetch(url);
        if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(filepath, buf);
        saved++;
      } else {
        console.log(`SKIP: ${slug} (${type})`);
        failed++;
        continue;
      }

      // Generate SQL: match by converting underscore slug to hyphen slug
      const dbSlug = slug.replace(/_/g, '-');
      sqlLines.push(`UPDATE slot_providers SET logo_url = '/providers/${filename}' WHERE slug = '${dbSlug}';`);
    } catch (err) {
      console.error(`FAIL: ${slug} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\nSaved: ${saved}, Failed: ${failed}`);

  // Also generate UPDATE by name for providers whose slug might differ
  const sqlByName = results
    .filter(r => r.type !== 'missing')
    .map(r => {
      const name = r.slug
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return `-- ${name}\nUPDATE slot_providers SET logo_url = '/providers/${r.slug}.png' WHERE slug = '${r.slug.replace(/_/g, '-')}' OR LOWER(name) = LOWER('${name}');`;
    });

  const migration = `-- Update slot_providers with scraped logo URLs
-- Logos saved to public/providers/*.png
-- Run in Supabase SQL Editor

${sqlByName.join('\n\n')}

-- Verify
SELECT name, slug, logo_url FROM slot_providers WHERE logo_url IS NOT NULL ORDER BY name;
`;

  writeFileSync('migrations/update_provider_logos.sql', migration);
  console.log('\nMigration saved to migrations/update_provider_logos.sql');
  console.log(`SQL statements: ${sqlByName.length}`);
}

main().catch(console.error);
