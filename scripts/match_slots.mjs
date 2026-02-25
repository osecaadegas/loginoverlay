/**
 * Match existing DB slot names to SlotCatalog sitemap URLs
 * Creates a priority list to scrape first
 */
import fs from 'fs';

// Load existing slots
let rawSlots = fs.readFileSync('scripts/all_slots.json', 'utf-8');
rawSlots = rawSlots.replace(/^\uFEFF/, '');
const existingSlots = JSON.parse(rawSlots);
console.log(`Existing DB slots: ${existingSlots.length}`);

// Load sitemap URLs
const sitemapData = JSON.parse(fs.readFileSync('scripts/sitemap_slot_urls.json', 'utf-8'));
console.log(`Sitemap URLs: ${sitemapData.urls.length}`);

// Build slug lookup from sitemap URLs
// URL format: https://slotcatalog.com/en/slots/sweet-bonanza → slug: "sweet-bonanza"
const slugToUrl = new Map();
for (const url of sitemapData.urls) {
  const slug = url.split('/').pop().toLowerCase();
  if (!slugToUrl.has(slug)) {
    slugToUrl.set(slug, url);
  }
}
console.log(`Unique slugs: ${slugToUrl.size}`);

// Slugify a name: "Sweet Bonanza" → "sweet-bonanza"
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[''"]/g, '')          // Remove quotes/apostrophes
    .replace(/[^a-z0-9]+/g, '-')    // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')        // Trim leading/trailing hyphens
    .replace(/-+/g, '-');            // Collapse multiple hyphens
}

// Try to match each existing slot to a sitemap URL
const matched = [];
const unmatched = [];

for (const slot of existingSlots) {
  const slug = slugify(slot.name);
  
  // Try exact slug match
  if (slugToUrl.has(slug)) {
    matched.push({ name: slot.name, url: slugToUrl.get(slug), matchType: 'exact' });
    continue;
  }
  
  // Try with provider suffix (common on SlotCatalog)
  const providerSlug = slugify(slot.provider || '');
  if (providerSlug && slugToUrl.has(`${slug}-${providerSlug}`)) {
    matched.push({ name: slot.name, url: slugToUrl.get(`${slug}-${providerSlug}`), matchType: 'with-provider' });
    continue;
  }
  
  // Try partial match (slug appears in any sitemap slug)
  let found = false;
  for (const [sitemapSlug, url] of slugToUrl) {
    if (sitemapSlug === slug || sitemapSlug.startsWith(slug + '-')) {
      matched.push({ name: slot.name, url: url, matchType: 'partial' });
      found = true;
      break;
    }
  }
  
  if (!found) {
    unmatched.push(slot.name);
  }
}

console.log(`\n=== Matching Results ===`);
console.log(`Matched: ${matched.length} / ${existingSlots.length}`);
console.log(`  Exact: ${matched.filter(m => m.matchType === 'exact').length}`);
console.log(`  With provider: ${matched.filter(m => m.matchType === 'with-provider').length}`);
console.log(`  Partial: ${matched.filter(m => m.matchType === 'partial').length}`);
console.log(`Unmatched: ${unmatched.length}`);

// Save priority URLs
const priorityUrls = matched.map(m => m.url);
fs.writeFileSync('scripts/priority_urls.json', JSON.stringify({
  total: priorityUrls.length,
  urls: priorityUrls,
  matchMap: Object.fromEntries(matched.map(m => [m.url, m.name]))
}, null, 2));
console.log(`\nSaved ${priorityUrls.length} priority URLs to scripts/priority_urls.json`);

// Show some unmatched examples
console.log(`\nUnmatched examples:`);
unmatched.slice(0, 20).forEach(n => console.log(`  ${n} → slug: ${slugify(n)}`));
