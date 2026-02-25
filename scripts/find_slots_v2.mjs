// Find ALL slot URLs from SlotCatalog via listing pagination + sitemap
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

  // 1. Check sitemap index
  console.log('=== Checking sitemaps ===');
  for (const url of [
    'https://slotcatalog.com/sitemap.xml',
    'https://slotcatalog.com/sitemap-index.xml',
    'https://slotcatalog.com/sitemaps.xml'
  ]) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const content = await page.content();
      const urls = content.match(/https?:\/\/slotcatalog\.com[^<"\s]+/g) || [];
      if (urls.length > 0) {
        console.log(`${url}: ${urls.length} URLs`);
        urls.slice(0, 10).forEach(u => console.log(`  ${u}`));
        
        // If it's a sitemap index, check sub-sitemaps
        const subMaps = urls.filter(u => u.includes('sitemap') && u.endsWith('.xml'));
        for (const sub of subMaps) {
          console.log(`  --- Sub-sitemap: ${sub} ---`);
          try {
            await page.goto(sub, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const subContent = await page.content();
            const subUrls = subContent.match(/https?:\/\/slotcatalog\.com\/en\/slots\/[^<"\s]+/g) || [];
            console.log(`  Slot URLs: ${subUrls.length}`);
            if (subUrls.length > 0) console.log(`  Sample:`, subUrls.slice(0, 3));
          } catch (e) { console.log(`  Error: ${e.message}`); }
        }
      }
    } catch (e) { console.log(`${url}: Error - ${e.message}`); }
  }

  // 2. Test paginated listing
  console.log('\n=== Testing listing pagination ===');
  const allSlotUrls = new Set();
  
  for (let p = 1; p <= 5; p++) {
    const url = `https://slotcatalog.com/en/The-Best-Slots?p=${p}`;
    console.log(`Page ${p}: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      const slotUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/en/slots/"]'));
        const seen = new Set();
        const results = [];
        for (const a of links) {
          let href = a.getAttribute('href');
          if (!href || href.includes('#')) continue;
          if (!href.startsWith('http')) href = 'https://slotcatalog.com' + href;
          const base = href.split('#')[0].split('?')[0];
          if (!seen.has(base)) {
            seen.add(base);
            results.push(base);
          }
        }
        return results;
      });
      
      console.log(`  Found ${slotUrls.length} unique slot URLs`);
      slotUrls.forEach(u => allSlotUrls.add(u));
      if (slotUrls.length === 0) break;
    } catch (e) { console.log(`  Error: ${e.message}`); break; }
    
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\nTotal unique slot URLs from pagination: ${allSlotUrls.size}`);

  // 3. Test Free Slots listing (different page, might have different slots)
  console.log('\n=== Testing Free Slots listing ===');
  await page.goto('https://slotcatalog.com/en/Free-Slots-Online', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const freeSlots = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/en/slots/"]'));
    const seen = new Set();
    for (const a of links) {
      let href = a.getAttribute('href');
      if (!href || href.includes('#')) continue;
      if (!href.startsWith('http')) href = 'https://slotcatalog.com' + href;
      seen.add(href.split('#')[0].split('?')[0]);
    }
    return { count: seen.size, hasPagination: document.body.innerHTML.includes('?p=2') };
  });
  console.log('Free slots page:', freeSlots);

  // 4. Test New Slots listing
  console.log('\n=== Testing New Slots listing ===');
  await page.goto('https://slotcatalog.com/en/New-Slots', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const newSlots = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/en/slots/"]'));
    return { count: links.length };
  });
  console.log('New slots page:', newSlots);

  // 5. Try AJAX inside the page with different params for ALL slots
  console.log('\n=== Trying AJAX from within page ===');
  await page.goto('https://slotcatalog.com/en/The-Best-Slots', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const ajaxData = await page.evaluate(async () => {
    const results = [];
    // Try various AJAX endpoints
    const endpoints = [
      '/index.php?ajax=1&blck=slotDT&lang=en&p=1&pp=100&sort=name',
      '/index.php?ajax=1&blck=slotCards&lang=en&p=1&pp=100',
      '/index.php?ajax=1&blck=slotList&lang=en&p=1&pp=100',
      '/index.php?ajax=1&blck=blkSlots&lang=en&p=1&pp=100',
      '/index.php?ajax=1&blck=games&lang=en&p=1&pp=100',
      '/index.php?ajax=1&blck=slotDT&lang=en&p=2&pp=24&sort=SlotRank&type=1',
    ];
    
    for (const url of endpoints) {
      try {
        const r = await fetch(url);
        const text = await r.text();
        if (text.length > 50) {
          const slotUrls = (text.match(/\/en\/slots\/[\w-]+/g) || []).length;
          results.push({ url: url.substring(0, 60), length: text.length, slotUrls, sample: text.substring(0, 200) });
        }
      } catch (e) {}
    }
    return results;
  });
  
  if (ajaxData.length > 0) {
    console.log(JSON.stringify(ajaxData, null, 2));
  } else {
    console.log('No AJAX endpoints returned useful data');
  }

  await browser.close();
}

main().catch(console.error);
