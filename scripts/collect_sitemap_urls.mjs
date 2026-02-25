import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteerExtra.use(StealthPlugin());

const OUT_FILE = 'scripts/sitemap_slot_urls.json';

const browser = await puppeteerExtra.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

// Step 1: Warm up Cloudflare cookies, then navigate to sitemap.xml
console.log('Warming up session...');
await page.goto('https://slotcatalog.com/en/The-Best-Slots', { waitUntil: 'networkidle2', timeout: 30000 });
console.log('Session warm. Now fetching sitemap.xml...');

// Try multiple sitemap URLs
const sitemapUrls = [
  'https://slotcatalog.com/sitemap-index.xml',
  'https://slotcatalog.com/sitemap.xml',
  'https://slotcatalog.com/sitemap_index.xml',
];

let elSitemaps = [];

for (const sUrl of sitemapUrls) {
  try {
    const resp = await page.goto(sUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    console.log(`${sUrl}: status=${resp.status()}`);
    if (resp.status() === 200) {
      const content = await page.content();
      // Try links from DOM
      const links = await page.evaluate(() => [...document.querySelectorAll('a')].map(a => a.href));
      const sitmapLinks = links.filter(l => l.includes('sitemap-') && l.endsWith('.xml'));
      if (sitmapLinks.length > 0) {
        elSitemaps = [...new Set(sitmapLinks)];
        console.log(`Found ${elSitemaps.length} sub-sitemaps via DOM links`);
        break;
      }
      // Fallback: regex on page content
      const textUrls = [...content.matchAll(/https?:\/\/slotcatalog\.com\/sitemap-[^\s<"']+\.xml/g)].map(m => m[0]);
      if (textUrls.length > 0) {
        elSitemaps = [...new Set(textUrls)];
        console.log(`Found ${elSitemaps.length} sub-sitemaps via regex`);
        break;
      }
      console.log(`  content sample: ${content.substring(0, 200)}`);
    }
  } catch (e) {
    console.log(`${sUrl}: ERROR - ${e.message}`);
  }
}

// If still empty, try the robots.txt for sitemap reference
if (elSitemaps.length === 0) {
  console.log('Trying robots.txt...');
  const resp = await page.goto('https://slotcatalog.com/robots.txt', { waitUntil: 'networkidle2', timeout: 15000 });
  const robotsTxt = await page.evaluate(() => document.body.innerText);
  console.log('robots.txt:', robotsTxt.substring(0, 500));
}

if (elSitemaps.length > 0) console.log('Sample:', elSitemaps.slice(0, 3));

// Convert -el to -en
const enSitemaps = [...new Set(
  elSitemaps
    .filter(u => u.endsWith('-el.xml'))
    .map(u => u.replace(/-el\.xml$/, '-en.xml'))
)];
console.log(`${enSitemaps.length} unique -en sitemaps`);

if (enSitemaps.length === 0) {
  console.log('No sitemaps found');
  await browser.close();
  process.exit(1);
}

// Step 2: Navigate to each sub-sitemap and extract slot URLs
const allSlotUrls = new Set();
let processed = 0;
let errors = 0;

for (const sitemapUrl of enSitemaps) {
  processed++;
  try {
    await page.goto(sitemapUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    // Extract slot URLs from the rendered XML
    const urls = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')];
      return links.map(a => a.href).filter(h => h.includes('/en/slots/'));
    });
    // Also fallback to page content regex
    let finalUrls = urls;
    if (urls.length === 0) {
      const content = await page.content();
      finalUrls = [...content.matchAll(/https:\/\/slotcatalog\.com\/en\/slots\/[^<"'\s]+/g)].map(m => m[0]);
    }
    
    finalUrls.forEach(u => allSlotUrls.add(u));
    if (processed % 50 === 0 || finalUrls.length > 100) {
      console.log(`[${processed}/${enSitemaps.length}] ${sitemapUrl.split('/').pop()}: ${finalUrls.length} URLs (total: ${allSlotUrls.size})`);
    }
  } catch (e) {
    errors++;
  }
  
  // Save progress every 100 sitemaps
  if (processed % 100 === 0) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({ totalUrls: allSlotUrls.size, urls: [...allSlotUrls].sort() }));
    console.log(`  [progress saved: ${allSlotUrls.size} URLs]`);
  }
}

console.log(`\nDone! Total unique slot URLs: ${allSlotUrls.size}, Errors: ${errors}`);

const result = {
  totalUrls: allSlotUrls.size,
  collectedAt: new Date().toISOString(),
  urls: [...allSlotUrls].sort()
};
fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2));
console.log(`Saved to ${OUT_FILE}`);

await browser.close();
