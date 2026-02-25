// Test: extract full slot data from individual SlotCatalog pages
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

  // Test scraping individual slot page for ALL data fields
  const testSlots = [
    'https://slotcatalog.com/en/slots/Sweet-Bonanza',
    'https://slotcatalog.com/en/slots/Gates-of-Olympus',
    'https://slotcatalog.com/en/slots/Book-of-Dead'
  ];

  for (const url of testSlots) {
    console.log(`\n=== ${url} ===`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    const data = await page.evaluate(() => {
      const result = {};
      
      // Get slot name from title or h1
      const h1 = document.querySelector('h1');
      result.name = h1 ? h1.textContent.replace(/Demo.*|Slot.*|Review.*/gi, '').trim() : '';
      
      // Get image
      const ogImg = document.querySelector('meta[property="og:image"]');
      result.image = ogImg ? ogImg.getAttribute('content') : '';
      
      // Get attributes from propLeft/propRight table
      const propLefts = document.querySelectorAll('.propLeft, th.propLeft, td.propLeft');
      for (const el of propLefts) {
        const label = el.textContent.trim().replace(/:$/, '');
        const row = el.closest('tr');
        if (!row) continue;
        const rightCell = row.querySelector('.propRight, td.propRight');
        if (!rightCell) continue;
        const value = rightCell.textContent.trim();
        
        if (label.startsWith('Provider')) result.provider = value;
        if (label.startsWith('RTP')) result.rtp = value;
        if (label.startsWith('Variance')) result.variance = value;
        if (label.startsWith('Max Win')) result.maxWin = value;
        if (label.startsWith('Layout')) result.layout = value;
        if (label.startsWith('Betways')) result.betways = value;
        if (label.startsWith('Release')) result.releaseDate = value;
        if (label.startsWith('Min bet')) result.minBet = value;
        if (label.startsWith('Max bet')) result.maxBet = value;
        if (label.startsWith('Type')) result.type = value;
      }
      
      // Also check data-label Max Win
      const maxWinEl = document.querySelector('[data-label="Max Win"]');
      if (maxWinEl && !result.maxWin) {
        result.maxWin = maxWinEl.textContent.trim();
      }
      
      return result;
    });
    
    console.log(JSON.stringify(data, null, 2));
  }

  // Now test: get the FULL provider list from SlotCatalog
  console.log('\n\n=== Getting full provider list ===');
  await page.goto('https://slotcatalog.com/en/Providers', { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Try the AJAX to load all providers  
  const providerData = await page.evaluate(async () => {
    // Check if there's a "show all" or "load more"
    const body = document.body.innerHTML;
    const allProvLinks = Array.from(document.querySelectorAll('a[href*="/en/soft/"]'));
    const seen = new Set();
    const providers = [];
    for (const a of allProvLinks) {
      const href = a.getAttribute('href');
      if (!href || href.includes('#') || seen.has(href)) continue;
      seen.add(href);
      const text = a.textContent.trim();
      if (text.length > 1 && !['Read more', 'Games', 'Casinos', 'Providers'].includes(text)) {
        // Extract the slug from href
        const match = href.match(/\/en\/soft\/([\w-]+)/);
        providers.push({ name: text, slug: match ? match[1] : href });
      }
    }
    return providers;
  });
  
  console.log(`Providers found: ${providerData.length}`);
  providerData.forEach(p => console.log(`  ${p.name} -> ${p.slug}`));

  // Check if there's a full provider list URL or AJAX endpoint
  console.log('\n=== Trying to find more providers ===');
  const moreProviders = await page.evaluate(async () => {
    // Try AJAX for more providers
    try {
      const r = await fetch('/index.php?ajax=1&blck=brandDT&lang=en&p=1&sort=SlotRank&pp=500');
      const text = await r.text();
      if (text.length > 10) return { ajax: true, length: text.length, sample: text.substring(0, 500) };
    } catch (e) {}
    
    // Check for "Show All" buttons
    const buttons = Array.from(document.querySelectorAll('a, button')).filter(b => {
      const t = b.textContent.toLowerCase();
      return t.includes('all providers') || t.includes('show all') || t.includes('view all') || t.includes('more providers');
    });
    
    return { 
      ajax: false, 
      buttons: buttons.map(b => ({ text: b.textContent.trim(), href: b.getAttribute('href') }))
    };
  });
  console.log(JSON.stringify(moreProviders, null, 2));

  await browser.close();
}

main().catch(console.error);
