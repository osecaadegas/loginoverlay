import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteerExtra.use(StealthPlugin());

const browser = await puppeteerExtra.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

// ---- Test 1: Try -en sitemaps ----
console.log('\n=== TEST 1: English sitemaps ===');
const testProviders = ['pragmatic-play', 'netent', 'hacksaw-gaming', 'playn-go'];
for (const slug of testProviders) {
  const url = `https://slotcatalog.com/sitemap-${slug}-en.xml`;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    const content = await page.content();
    const urlMatches = content.match(/<loc>/g);
    console.log(`  ${slug}-en: status=${resp.status()}, URLs=${urlMatches ? urlMatches.length : 0}`);
    if (urlMatches && urlMatches.length > 0) {
      // Extract first 3 URLs
      const urls = [...content.matchAll(/<loc>(.*?)<\/loc>/g)].slice(0, 3).map(m => m[1]);
      console.log('    Sample:', urls);
    }
  } catch (e) {
    console.log(`  ${slug}-en: ERROR - ${e.message}`);
  }
}

// ---- Test 2: Try sitemap without language suffix ----
console.log('\n=== TEST 2: Sitemaps without lang suffix ===');
for (const slug of testProviders.slice(0, 2)) {
  const url = `https://slotcatalog.com/sitemap-${slug}.xml`;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    const content = await page.content();
    const urlMatches = content.match(/<loc>/g);
    console.log(`  ${slug}: status=${resp.status()}, URLs=${urlMatches ? urlMatches.length : 0}`);
    if (urlMatches && urlMatches.length > 0) {
      const urls = [...content.matchAll(/<loc>(.*?)<\/loc>/g)].slice(0, 3).map(m => m[1]);
      console.log('    Sample:', urls);
    }
  } catch (e) {
    console.log(`  ${slug}: ERROR - ${e.message}`);
  }
}

// ---- Test 3: Full pagination on Best Slots (go up to page 50) ----
console.log('\n=== TEST 3: Pagination /en/The-Best-Slots ===');
let totalSlotsFound = 0;
let lastPageWithSlots = 0;
const allSlotUrls = new Set();

for (let p = 1; p <= 50; p++) {
  const url = `https://slotcatalog.com/en/The-Best-Slots?p=${p}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const slotLinks = await page.evaluate(() => {
      // Look for slot links - typically go to individual slot pages
      const links = [...document.querySelectorAll('a[href*="/en/slots/"]')];
      return links.map(a => a.href).filter(h => h.includes('/en/slots/'));
    });
    const uniqueNew = slotLinks.filter(u => !allSlotUrls.has(u));
    uniqueNew.forEach(u => allSlotUrls.add(u));
    
    if (uniqueNew.length === 0 && p > 3) {
      console.log(`  Page ${p}: 0 new slots - stopping pagination`);
      break;
    }
    console.log(`  Page ${p}: ${uniqueNew.length} new slots (total: ${allSlotUrls.size})`);
    lastPageWithSlots = p;
    totalSlotsFound = allSlotUrls.size;
  } catch (e) {
    console.log(`  Page ${p}: ERROR - ${e.message}`);
    break;
  }
}

// ---- Test 4: Try Free-Slots-Online pagination ----
console.log('\n=== TEST 4: Pagination /en/Free-Slots-Online ===');
const freeSlotUrls = new Set();
for (let p = 1; p <= 10; p++) {
  const url = `https://slotcatalog.com/en/Free-Slots-Online?p=${p}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const slotLinks = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href*="/en/slots/"]')];
      return links.map(a => a.href).filter(h => h.includes('/en/slots/'));
    });
    const uniqueNew = slotLinks.filter(u => !freeSlotUrls.has(u));
    uniqueNew.forEach(u => freeSlotUrls.add(u));
    
    if (uniqueNew.length === 0 && p > 1) {
      console.log(`  Page ${p}: 0 new slots - stopping`);
      break;
    }
    console.log(`  Page ${p}: ${uniqueNew.length} new slots (total: ${freeSlotUrls.size})`);
  } catch (e) {
    console.log(`  Page ${p}: ERROR - ${e.message}`);
    break;
  }
}

// ---- Test 5: Try Provider page slot listing (scrape all provider links, then visit each provider's game list) ----
console.log('\n=== TEST 5: Provider pages with full slot tables ===');
await page.goto('https://slotcatalog.com/en/Ede-Best-Slots/Pragmatic-Play', { waitUntil: 'networkidle2', timeout: 20000 });

// Check if there's a "View All" or pagination
const providerInfo = await page.evaluate(() => {
  // Count all slot links
  const slotLinks = [...document.querySelectorAll('a[href*="/en/slots/"]')];
  // Check for pagination or "show more"
  const paginationLinks = [...document.querySelectorAll('a[href*="?p="]')];
  const showMore = document.querySelector('.show-more, .load-more, [class*="more"], button[class*="more"]');
  // Check for total count indicator
  const totalText = document.body.innerText.match(/(\d+)\s*(slots?|games?)/i);
  return {
    slotLinks: slotLinks.length,
    sampleLinks: slotLinks.slice(0, 5).map(a => a.href),
    paginationPages: paginationLinks.map(a => a.href),
    hasShowMore: !!showMore,
    totalIndicator: totalText ? totalText[0] : null,
    // Check URL structure for any query params
    currentUrl: window.location.href
  };
});
console.log('  Provider page (Pragmatic Play):', JSON.stringify(providerInfo, null, 2));

// Try provider page pagination
if (providerInfo.paginationPages.length > 0) {
  console.log('  Found pagination:', providerInfo.paginationPages.slice(0, 5));
}

// ---- Test 6: Check if provider page has paginated sub-pages ----
console.log('\n=== TEST 6: Provider page with ?p= param ===');
for (let p = 1; p <= 5; p++) {
  const url = `https://slotcatalog.com/en/Ede-Best-Slots/Pragmatic-Play?p=${p}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const count = await page.evaluate(() => {
      return document.querySelectorAll('a[href*="/en/slots/"]').length;
    });
    console.log(`  Pragmatic Play page ${p}: ${count} slot links`);
    if (count === 0 && p > 1) break;
  } catch (e) {
    console.log(`  Page ${p}: ERROR - ${e.message}`);
    break;
  }
}

// ---- Test 7: Try the search/filter endpoint ----
console.log('\n=== TEST 7: Search endpoint ===');
try {
  await page.goto('https://slotcatalog.com/en/The-Best-Slots', { waitUntil: 'networkidle2', timeout: 20000 });
  
  // Check if there's any AJAX data loading by intercepting requests
  const searchResult = await page.evaluate(async () => {
    // Try fetching search API
    const endpoints = [
      '/api/slots',
      '/en/api/slots',
      '/api/search',
      '/en/search?q=',
      '/Ajax/GetSlots',
      '/Ajax/Slots',
    ];
    const results = {};
    for (const ep of endpoints) {
      try {
        const r = await fetch(ep);
        results[ep] = { status: r.status, contentType: r.headers.get('content-type') };
        if (r.ok) {
          const text = await r.text();
          results[ep].length = text.length;
          results[ep].preview = text.substring(0, 200);
        }
      } catch (e) {
        results[ep] = { error: e.message };
      }
    }
    return results;
  });
  console.log('  Search endpoints:', JSON.stringify(searchResult, null, 2));
} catch (e) {
  console.log('  Search test error:', e.message);
}

// ---- Test 8: Check slot URL format from known slot name ----
console.log('\n=== TEST 8: URL format test ===');
// Try visiting a slot by constructed URL
const testSlots = [
  { name: 'Sweet Bonanza', guessUrl: '/en/slots/Sweet-Bonanza' },
  { name: 'Gates of Olympus', guessUrl: '/en/slots/Gates-of-Olympus' },
  { name: 'Big Bass Bonanza', guessUrl: '/en/slots/Big-Bass-Bonanza' },
];
for (const slot of testSlots) {
  try {
    const resp = await page.goto(`https://slotcatalog.com${slot.guessUrl}`, { waitUntil: 'networkidle2', timeout: 15000 });
    const finalUrl = page.url();
    const title = await page.title();
    console.log(`  ${slot.name}: status=${resp.status()}, final=${finalUrl}, title=${title.substring(0, 60)}`);
  } catch (e) {
    console.log(`  ${slot.name}: ERROR - ${e.message}`);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Best Slots pagination found ${allSlotUrls.size} unique slot URLs across ${lastPageWithSlots} pages`);
console.log(`Free Slots found ${freeSlotUrls.size} unique slot URLs`);

await browser.close();
