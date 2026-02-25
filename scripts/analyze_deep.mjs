// Deep analysis of SlotCatalog provider page structure
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

  // 1. Get the full list of providers
  console.log('=== Loading Providers page ===');
  await page.goto('https://slotcatalog.com/en/Providers', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const providers = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('a[href*="/en/soft/"]'));
    const seen = new Set();
    const result = [];
    for (const a of cards) {
      const href = a.getAttribute('href');
      if (href && !seen.has(href) && !href.includes('#')) {
        seen.add(href);
        const name = a.textContent.trim();
        if (name.length > 1 && name !== 'Read more' && name !== 'Games' && name !== 'Casinos') {
          result.push({ name, href });
        }
      }
    }
    return result;
  });
  
  console.log(`Found ${providers.length} providers`);
  providers.forEach(p => console.log(`  ${p.name} -> ${p.href}`));

  // 2. Deep dive into a provider page - Pragmatic Play
  console.log('\n=== Analyzing Pragmatic Play slot table ===');
  await page.goto('https://slotcatalog.com/en/soft/Pragmatic-Play', { waitUntil: 'networkidle2', timeout: 30000 });

  // Check if there's a "show all" or pagination
  const tableData = await page.evaluate(() => {
    // Find the slot table - look for rows with RTP data
    const allRows = Array.from(document.querySelectorAll('tr'));
    const slotRows = allRows.filter(r => {
      const text = r.textContent;
      return text.includes('%') && (text.includes('High') || text.includes('Low') || text.includes('Med'));
    });
    
    const rows = slotRows.slice(0, 5).map(r => {
      const cells = Array.from(r.querySelectorAll('td, th'));
      return {
        cellCount: cells.length,
        cells: cells.map(c => ({
          text: c.textContent.trim().substring(0, 60),
          dataLabel: c.getAttribute('data-label'),
          html: c.innerHTML.substring(0, 200)
        }))
      };
    });

    // Check for "load more" or "show all" buttons
    const buttons = Array.from(document.querySelectorAll('button, a.btn, [class*=load], [class*=more], [onclick*=load]'));
    const loadButtons = buttons.filter(b => {
      const t = b.textContent.toLowerCase();
      return t.includes('load') || t.includes('more') || t.includes('show all') || t.includes('all games');
    }).map(b => ({
      text: b.textContent.trim().substring(0, 50),
      tag: b.tagName,
      onclick: b.getAttribute('onclick')?.substring(0, 100),
      class: b.className.substring(0, 50)
    }));

    // Check for pagination
    const paging = Array.from(document.querySelectorAll('[class*=pag] a, .paging a, a[href*=page], a[href*=p=]'));
    const pageLinks = paging.map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href')?.substring(0, 100)
    })).filter(l => l.text.length > 0);

    // Total count from page
    const bodyText = document.body.innerText;
    const totalMatch = bodyText.match(/Total Games[:\s]*(\d+)/i) || bodyText.match(/(\d{2,4})\s*(?:Video Slots|games)/i);

    return {
      totalSlotRows: slotRows.length,
      sampleRows: rows,
      loadButtons,
      pageLinks: pageLinks.slice(0, 10),
      totalText: totalMatch ? totalMatch[0] : 'none'
    };
  });

  console.log('Total slot rows visible:', tableData.totalSlotRows);
  console.log('Total text:', tableData.totalText);
  console.log('Load buttons:', JSON.stringify(tableData.loadButtons, null, 2));
  console.log('Page links:', JSON.stringify(tableData.pageLinks, null, 2));
  console.log('\nSample row structure:');
  if (tableData.sampleRows.length > 0) {
    const row = tableData.sampleRows[0];
    console.log(`  Cells: ${row.cellCount}`);
    row.cells.forEach((c, i) => {
      console.log(`  Cell ${i}: label="${c.dataLabel}" text="${c.text}"`);
    });
  }

  // 3. Check the Highest RTP table and Highest Max Win table
  console.log('\n=== Checking section names ===');
  const sections = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('h2, h3'));
    return headers.map(h => h.textContent.trim().substring(0, 80)).filter(t => t.length > 3);
  });
  sections.forEach(s => console.log(`  ${s}`));

  // 4. Check the "All Games" section specifically
  console.log('\n=== Checking #aBrandGames section ===');
  const gamesSection = await page.evaluate(() => {
    const anchor = document.querySelector('#aBrandGames, [id*=BrandGames], [id*=brandgames]');
    if (!anchor) return { found: false };
    
    // Find the nearest table or data section after this anchor
    let el = anchor;
    for (let i = 0; i < 10; i++) {
      el = el.nextElementSibling;
      if (!el) break;
      if (el.tagName === 'TABLE' || el.querySelector('table')) {
        const table = el.tagName === 'TABLE' ? el : el.querySelector('table');
        const rows = Array.from(table.querySelectorAll('tr'));
        return {
          found: true,
          rowCount: rows.length,
          firstRow: rows[0]?.textContent.trim().substring(0, 200),
          thirdRow: rows[2]?.textContent.trim().substring(0, 200)
        };
      }
      if (el.textContent.length > 100) {
        return { found: true, content: el.textContent.substring(0, 500) };
      }
    }
    return { found: true, note: 'anchor found but no table nearby' };
  });
  console.log(JSON.stringify(gamesSection, null, 2));

  // 5. Look for ALL slot data on the provider page (not just top tables)
  console.log('\n=== Extracting ALL slot data from page ===');
  const allSlotData = await page.evaluate(() => {
    const results = [];
    // Find all td with data-label
    const tdElements = document.querySelectorAll('td[data-label]');
    const byRow = new Map();
    
    for (const td of tdElements) {
      const tr = td.closest('tr');
      if (!tr) continue;
      const rowId = tr.rowIndex || Array.from(tr.parentNode.children).indexOf(tr);
      if (!byRow.has(tr)) byRow.set(tr, {});
      byRow.get(tr)[td.getAttribute('data-label')] = td.textContent.trim();
    }
    
    for (const [tr, data] of byRow) {
      if (Object.keys(data).length >= 2) {
        // Get slot name from the row
        const nameCell = tr.querySelector('td:first-child a, th a, td a[href*="/slots/"]');
        const name = nameCell ? nameCell.textContent.trim() : (data['Slot'] || data['Game'] || '');
        if (name) {
          results.push({ name, ...data });
        }
      }
    }
    return { count: results.length, sample: results.slice(0, 5) };
  });
  console.log('Slots with data-label:', allSlotData.count);
  console.log(JSON.stringify(allSlotData.sample, null, 2));

  // 6. Try different table extraction
  console.log('\n=== Alternative table extraction ===');
  const altData = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const results = [];
    for (const table of tables) {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length < 3) continue;
      
      // Check if this is a slot table by looking for RTP pattern
      const text = table.textContent;
      if (!text.includes('%') || !text.match(/\d{2,3}\.\d{1,2}%/)) continue;
      
      const headerCells = Array.from(rows[0].querySelectorAll('th, td')).map(c => c.textContent.trim());
      
      const dataRows = rows.slice(1).map(r => {
        const cells = Array.from(r.querySelectorAll('td'));
        const link = r.querySelector('a[href*="/slots/"]');
        return {
          name: link ? link.textContent.trim() : cells[0]?.textContent.trim(),
          href: link ? link.getAttribute('href') : null,
          cells: cells.map(c => c.textContent.trim().substring(0, 50))
        };
      });
      
      results.push({
        headers: headerCells,
        rowCount: dataRows.length,
        sample: dataRows.slice(0, 3)
      });
    }
    return results;
  });
  console.log(JSON.stringify(altData, null, 2));

  await browser.close();
}

main().catch(console.error);
