/**
 * SlotCatalog Scraper - Phase 2: Extract slot data from individual pages
 * 
 * Features:
 * - Reads slot URLs from sitemap_slot_urls.json
 * - Uses multiple browser tabs for parallel scraping
 * - Saves progress every N slots to scrape_progress.json
 * - Outputs final data to scraped_slots.json
 * - Resume support: skips already-scraped URLs
 * 
 * Usage: node scripts/scrape_slots.mjs [--concurrency=5] [--limit=100] [--start=0]
 */

import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

puppeteerExtra.use(StealthPlugin());

// ---- Config ----
const URLS_FILE = process.argv.find(a => a.startsWith('--urls='))?.split('=')[1] || 'scripts/sitemap_slot_urls.json';
const PROGRESS_FILE = 'scripts/scrape_progress.json';
const OUTPUT_FILE = 'scripts/scraped_slots.json';
const SAVE_INTERVAL = 50;     // Save progress every N slots
const CONCURRENCY = parseInt(process.argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '5');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
const START = parseInt(process.argv.find(a => a.startsWith('--start='))?.split('=')[1] || '0');
const PAGE_TIMEOUT = 20000;

// ---- Extraction logic (runs in browser context) ----
function extractSlotData() {
  const data = {};
  
  // Get slot name - try multiple sources
  // 1. og:title meta (cleanest)
  const ogTitle = document.querySelector('meta[property="og:title"]');
  let nameFromOg = ogTitle ? ogTitle.getAttribute('content') : '';
  nameFromOg = nameFromOg
    .replace(/\s*(Slot|Demo|Review|Free Play|Online|Game\s*Info|by\s+\w+.*|ðŸŽ°.*|áˆ.*|\|.*|[-–—]\s*(Slot|Play|Free|Demo).*)$/gi, '')
    .replace(/^\s*(Play|Try|Free)\s+/i, '')
    .trim();
  
  // 2. h1 (fallback)  
  const h1 = document.querySelector('h1');
  let nameFromH1 = h1 ? h1.textContent.trim() : '';
  nameFromH1 = nameFromH1
    .replace(/\s*(Slot|Demo|Review|Free Play|Online|Game\s*Info|by\s+\w+.*|ðŸŽ°.*|áˆ.*|\|.*|[-–—]\s*(Slot|Play|Free|Demo).*)$/gi, '')
    .replace(/^\s*(Play|Try|Free)\s+/i, '')
    .trim();
  
  // Use the shorter clean name (less noise)
  data.name = (nameFromOg.length > 0 && nameFromOg.length <= nameFromH1.length) ? nameFromOg : (nameFromH1 || nameFromOg);
  
  // Get image from og:image meta
  const ogImg = document.querySelector('meta[property="og:image"]');
  data.image = ogImg ? ogImg.getAttribute('content') : '';
  
  // Extract properties from the table with propLeft/propRight classes
  const propLefts = document.querySelectorAll('.propLeft, th.propLeft, td.propLeft');
  for (const el of propLefts) {
    const label = el.textContent.trim().replace(/:$/, '').toLowerCase();
    const row = el.closest('tr');
    if (!row) continue;
    const rightCell = row.querySelector('.propRight, td.propRight');
    if (!rightCell) continue;
    const value = rightCell.textContent.trim();
    
    if (label.includes('provider') || label.includes('software')) {
      data.provider = value;
    } else if (label.includes('rtp') || label.includes('return to player')) {
      data.rtp_raw = value;
    } else if (label.includes('variance') || label.includes('volatility')) {
      data.variance_raw = value;
    } else if (label.includes('max win') || label.includes('maximum win')) {
      data.max_win_raw = value;
    } else if (label.includes('layout') || label.includes('reels')) {
      data.layout = value;
    } else if (label.includes('betways') || label.includes('paylines') || label.includes('lines')) {
      data.betways = value;
    } else if (label.includes('release') || label.includes('date')) {
      data.release_date = value;
    } else if (label.includes('type')) {
      data.type = value;
    } else if (label.includes('min bet') || label.includes('minimum bet')) {
      data.min_bet = value;
    } else if (label.includes('max bet') || label.includes('maximum bet')) {
      data.max_bet = value;
    }
  }
  
  return data;
}

// ---- Parse raw values ----
function parseRtp(raw) {
  if (!raw) return null;
  const match = raw.match(/(\d{2,3}(?:\.\d{1,2})?)%/);
  return match ? parseFloat(match[1]) : null;
}

function parseVariance(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (v.includes('very') && v.includes('high')) return 'very_high';
  if (v.includes('extreme')) return 'very_high';
  if (v.includes('med') && v.includes('high')) return 'high';
  if (v === 'high') return 'high';
  if (v.includes('med') && v.includes('low')) return 'medium';
  if (v === 'med' || v === 'medium' || v === 'medium') return 'medium';
  if (v === 'low') return 'low';
  if (v.includes('low')) return 'low';
  if (v.includes('high')) return 'high';
  if (v.includes('med')) return 'medium';
  return null;
}

function parseMaxWin(raw) {
  if (!raw) return null;
  const match = raw.match(/[x×]?\s*([\d,]+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

// ---- Main ----
async function main() {
  // Load URLs
  const urlData = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
  let urls = urlData.urls;
  console.log(`Loaded ${urls.length} URLs from sitemap`);
  
  if (START > 0) urls = urls.slice(START);
  if (LIMIT > 0) urls = urls.slice(0, LIMIT);
  console.log(`Processing ${urls.length} URLs (concurrency=${CONCURRENCY})`);
  
  // Load existing progress
  let scraped = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    scraped = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    console.log(`Resuming: ${Object.keys(scraped).length} already scraped`);
  }
  
  // Filter out already-scraped URLs
  const remaining = urls.filter(u => !scraped[u]);
  console.log(`Remaining to scrape: ${remaining.length}`);
  
  if (remaining.length === 0) {
    console.log('Nothing to scrape!');
    writeOutput(scraped);
    return;
  }
  
  // Launch browser
  const browser = await puppeteerExtra.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  // Warm up with a normal page first
  const warmupPage = await browser.newPage();
  await warmupPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  await warmupPage.goto('https://slotcatalog.com/en/The-Best-Slots', { waitUntil: 'networkidle2', timeout: 30000 });
  await warmupPage.close();
  console.log('Session warmed up');
  
  // Create worker pages
  const pages = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const p = await browser.newPage();
    await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    // Block images, CSS, fonts to speed up
    await p.setRequestInterception(true);
    p.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    pages.push(p);
  }
  console.log(`Created ${CONCURRENCY} worker pages`);
  
  let completed = 0;
  let errors = 0;
  const startTime = Date.now();
  
  // Process URLs in batches
  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    
    const promises = batch.map(async (url, idx) => {
      const page = pages[idx % pages.length];
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
        // Wait a moment for dynamic content
        await page.waitForSelector('.propLeft, th.propLeft, td.propLeft', { timeout: 5000 }).catch(() => {});
        
        const rawData = await page.evaluate(extractSlotData);
        
        const parsed = {
          name: rawData.name || url.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          slug: url.split('/').pop(),  // URL slug for matching
          image: rawData.image || null,
          provider: rawData.provider || null,
          rtp: parseRtp(rawData.rtp_raw),
          volatility: parseVariance(rawData.variance_raw),
          max_win_multiplier: parseMaxWin(rawData.max_win_raw),
          layout: rawData.layout || null,
          betways: rawData.betways || null,
          release_date: rawData.release_date || null,
          type: rawData.type || null,
          min_bet: rawData.min_bet || null,
          max_bet: rawData.max_bet || null,
          url: url,
          rtp_raw: rawData.rtp_raw || null,
          variance_raw: rawData.variance_raw || null,
          max_win_raw: rawData.max_win_raw || null,
        };
        
        scraped[url] = parsed;
        completed++;
      } catch (e) {
        errors++;
        scraped[url] = { error: e.message, url };
      }
    });
    
    await Promise.all(promises);
    
    // Progress logging
    const total = completed + errors;
    if (total % SAVE_INTERVAL === 0 || total === remaining.length) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = total / elapsed;
      const eta = ((remaining.length - total) / rate / 60).toFixed(1);
      console.log(`[${total}/${remaining.length}] ${completed} ok, ${errors} err | ${rate.toFixed(1)}/s | ETA: ${eta}min`);
      
      // Save progress
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(scraped));
    }
  }
  
  // Close browser
  for (const p of pages) await p.close();
  await browser.close();
  
  // Write final output
  writeOutput(scraped);
  
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\nDone! ${completed} scraped, ${errors} errors in ${elapsed} minutes`);
}

function writeOutput(scraped) {
  const entries = Object.values(scraped).filter(s => !s.error);
  const result = {
    total: entries.length,
    errors: Object.values(scraped).filter(s => s.error).length,
    collectedAt: new Date().toISOString(),
    slots: entries,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Output: ${entries.length} slots saved to ${OUTPUT_FILE}`);
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(scraped));
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
