// Quick test: analyze SlotCatalog listing page structure
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

  console.log('Loading listing page...');
  await page.goto('https://slotcatalog.com/en/The-Best-Slots', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Title:', await page.title());

  // Analyze page structure
  const data = await page.evaluate(() => {
    // Slot links
    const links = Array.from(document.querySelectorAll('a[href*="/en/slots/"]'));
    const first10 = links.slice(0, 10).map(a => ({
      text: a.textContent.trim().substring(0, 60),
      href: a.getAttribute('href')
    }));

    // Total count
    const body = document.body.innerText;
    const totalMatch = body.match(/(\d{4,5})\s*(?:slots|games|results)/i);

    // Pagination
    const pageLinks = Array.from(document.querySelectorAll('.pagination a, a.page-link, [class*=pag] a, .paging a'));
    const pageInfo = pageLinks.slice(0, 5).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href')
    }));

    // Table structure
    const tables = Array.from(document.querySelectorAll('table'));
    const tableInfo = tables.map(t => ({
      rows: t.rows.length,
      classes: t.className,
      firstRowText: t.rows[0]?.textContent.trim().substring(0, 100)
    }));

    // Check for slot cards/divs
    const slotCards = document.querySelectorAll('[class*=slot], [class*=game-card], [class*=gameCard]');
    
    // Check for any "load more" button
    const loadMore = document.querySelector('[class*=loadMore], [class*=load-more], button[onclick*=load]');
    
    return {
      slotLinks: first10,
      totalSlotLinks: links.length,
      total: totalMatch ? totalMatch[0] : 'none',
      pageInfo,
      tables: tableInfo.slice(0, 3),
      slotCards: slotCards.length,
      hasLoadMore: loadMore ? loadMore.textContent.trim() : 'none'
    };
  });

  console.log(JSON.stringify(data, null, 2));

  // Now try the provider list page to see structure
  console.log('\n--- Checking Providers page ---');
  await page.goto('https://slotcatalog.com/en/Providers', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const provData = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/en/soft/"]'));
    return links.slice(0, 20).map(a => ({
      name: a.textContent.trim().substring(0, 40),
      href: a.getAttribute('href')
    })).filter(l => l.name.length > 1);
  });
  console.log('Providers found:', provData.length);
  console.log(provData.slice(0, 10));

  // Check provider page structure (individual provider)
  console.log('\n--- Checking individual provider page ---');
  await page.goto('https://slotcatalog.com/en/soft/Pragmatic-Play', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const provSlots = await page.evaluate(() => {
    // Look for slot data in tables
    const rows = Array.from(document.querySelectorAll('tr[data-translit], tr[class*=slot], .trBody'));
    const firstRows = rows.slice(0, 5).map(r => ({
      text: r.textContent.trim().substring(0, 150),
      html: r.innerHTML.substring(0, 300),
      cells: Array.from(r.cells || []).map(c => c.textContent.trim().substring(0, 50))
    }));
    
    // Also check data-label attributes
    const dataLabels = Array.from(document.querySelectorAll('[data-label]'));
    const labels = [...new Set(dataLabels.map(e => e.getAttribute('data-label')))];
    
    return { rows: rows.length, firstRows, dataLabels: labels };
  });
  
  console.log('Total rows:', provSlots.rows);
  console.log('Data labels:', provSlots.dataLabels);
  if (provSlots.firstRows.length > 0) {
    console.log('First row cells:', provSlots.firstRows[0].cells);
  }

  await browser.close();
}

main().catch(console.error);
