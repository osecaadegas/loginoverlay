// Get sitemap and full provider list from SlotCatalog
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', r => {
    ['image', 'stylesheet', 'font', 'media'].includes(r.resourceType()) ? r.abort() : r.continue();
  });

  // 1. Check sitemap
  console.log('=== Checking sitemap ===');
  await page.goto('https://slotcatalog.com/sitemap.xml', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const sitemapContent = await page.content();
  const sitemapUrls = sitemapContent.match(/https:\/\/slotcatalog\.com[^<"]+/g) || [];
  console.log('Sitemap URLs found:', sitemapUrls.length);
  const slotSitemaps = sitemapUrls.filter(u => u.includes('slot') || u.includes('game'));
  console.log('Slot-related:', slotSitemaps.slice(0, 10));

  // 2. Check if there's a slots sitemap
  for (const sitemapUrl of slotSitemaps.slice(0, 3)) {
    console.log(`\n--- Checking ${sitemapUrl} ---`);
    try {
      await page.goto(sitemapUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const content = await page.content();
      const urls = content.match(/https:\/\/slotcatalog\.com\/en\/slots\/[^<"]+/g) || [];
      console.log(`Slot URLs: ${urls.length}`);
      if (urls.length > 0) console.log('Sample:', urls.slice(0, 5));
    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  // 3. If no sitemap, try the full providers page
  console.log('\n=== Getting ALL providers ===');
  await page.goto('https://slotcatalog.com/en/Providers', { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Try scrolling/loading more
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 2000));
  
  // Try clicking "show all" types of buttons
  const showAllResult = await page.evaluate(async () => {
    // Find container with all providers
    const allLinks = Array.from(document.querySelectorAll('a'));
    const provLinks = allLinks.filter(a => {
      const href = a.getAttribute('href') || '';
      return href.match(/\/en\/soft\/[\w-]+$/) && !href.includes('#');
    });
    
    const seen = new Set();
    const providers = [];
    for (const a of provLinks) {
      const href = a.getAttribute('href');
      if (seen.has(href)) continue;
      seen.add(href);
      const text = a.textContent.trim();
      if (text.length > 1 && !['Read more', 'Games', 'Casinos'].includes(text)) {
        const slug = href.match(/\/en\/soft\/([\w-]+)/);
        providers.push({ name: text, slug: slug ? slug[1] : '' });
      }
    }
    return providers;
  });
  
  console.log(`Found ${showAllResult.length} provider links`);

  // 4. Try get all providers via direct URL patterns
  console.log('\n=== Trying provider list URL with sorting ===');
  await page.goto('https://slotcatalog.com/en/Providers?sort=name', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const allProvs = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a'));
    const seen = new Set();
    return allLinks
      .filter(a => (a.getAttribute('href') || '').match(/\/en\/soft\/[\w-]+$/))
      .map(a => ({ name: a.textContent.trim(), href: a.getAttribute('href') }))
      .filter(p => {
        if (seen.has(p.href) || p.name.length <= 1 || ['Read more', 'Games', 'Casinos'].includes(p.name)) return false;
        seen.add(p.href);
        return true;
      });
  });
  console.log(`Providers with sort=name: ${allProvs.length}`);
  allProvs.slice(0, 5).forEach(p => console.log(`  ${p.name} -> ${p.href}`));

  // 5. Try the AJAX endpoint for provider listing
  console.log('\n=== Trying AJAX for providers ===');
  const ajaxResult = await page.evaluate(async () => {
    const results = [];
    for (const blck of ['brandDT', 'brandList', 'softList', 'slotProviders']) {
      try {
        const r = await fetch(`/index.php?ajax=1&blck=${blck}&lang=en&pp=500`);
        const text = await r.text();
        if (text.length > 50) {
          results.push({ blck, length: text.length, sample: text.substring(0, 300) });
        }
      } catch (e) {}
    }
    return results;
  });
  console.log(JSON.stringify(ajaxResult, null, 2));

  // 6. Alternative: get slot URLs from individual provider pages using their "All Games" AJAX
  console.log('\n=== Trying provider-specific AJAX ===');
  await page.goto('https://slotcatalog.com/en/soft/Pragmatic-Play', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const provGames = await page.evaluate(async () => {
    const results = [];
    // Try different AJAX endpoints for provider games
    for (const blck of ['slotDT', 'brandSlotDT', 'brandGamesDT', 'softSlotDT', 'brandGames']) {
      try {
        const r = await fetch(`/index.php?ajax=1&blck=${blck}&lang=en&softid=65&pp=500&sort=SlotRank`);
        const text = await r.text();
        if (text.length > 100) {
          // Count slot URLs in response
          const slotUrls = text.match(/\/en\/slots\/[\w-]+/g) || [];
          results.push({ blck, length: text.length, slotUrls: slotUrls.length, sample: text.substring(0, 300) });
        }
      } catch (e) {}
    }
    return results;
  });
  console.log(JSON.stringify(provGames, null, 2));

  await browser.close();
}

main().catch(console.error);
