import { readFileSync } from 'fs';
import https from 'https';

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        res.resume();
        if (loc) {
          const full = loc.startsWith('http') ? loc : `https://slotcatalog.com${loc}`;
          fetchPage(full).then(resolve);
        } else resolve(null);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', () => resolve(null));
  });
}

function toSlug(name) {
  return name.trim()
    .replace(/['`\u2019]/g, '-')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSlotData(html) {
  if (!html) return null;
  const result = {};

  // RTP
  const rtpMatch = html.match(/propLeft">RTP[\s\S]{0,500}?propRight">\s*(?:<[^>]*>\s*)*(\d{2,3}\.\d{1,2})%/i);
  if (rtpMatch) {
    const rtp = parseFloat(rtpMatch[1]);
    if (rtp >= 80 && rtp <= 99.99) result.rtp = rtp;
  }
  if (!result.rtp) {
    const rtpFb = html.match(/Game RTP:\s*(\d{2,3}\.\d{1,2})%/i);
    if (rtpFb) {
      const rtp = parseFloat(rtpFb[1]);
      if (rtp >= 80 && rtp <= 99.99) result.rtp = rtp;
    }
  }

  // Variance
  const varMatch = html.match(/propLeft">Variance[\s\S]{0,500}?propRight">\s*(?:<[^>]*>\s*)*(Low|Med-Low|Med|Medium|Med-High|High|Very\s*High|Extreme)/i);
  if (varMatch) {
    const v = varMatch[1].toLowerCase().trim().replace(/\s+/g, '-');
    if (v === 'low') result.volatility = 'low';
    else if (['med-low', 'med', 'medium'].includes(v)) result.volatility = 'medium';
    else if (v === 'med-high') result.volatility = 'high';
    else if (v === 'high') result.volatility = 'high';
    else if (['very-high', 'extreme'].includes(v)) result.volatility = 'very_high';
  }

  // Max Win
  const maxWinMatch = html.match(/data-label="Max Win"[^>]*>\s*x(\d+\.?\d*)/i);
  if (maxWinMatch) {
    const mw = parseFloat(maxWinMatch[1]);
    if (mw >= 1 && mw <= 999999) result.max_win = mw;
  }
  if (!result.max_win) {
    const mwFb = html.match(/propLeft">Max Win[\s\S]{0,500}?x(\d+\.?\d*)/i);
    if (mwFb) {
      const mw = parseFloat(mwFb[1]);
      if (mw >= 1 && mw <= 999999) result.max_win = mw;
    }
  }

  return (result.rtp || result.volatility || result.max_win) ? result : null;
}

async function main() {
  const raw = readFileSync('scripts/all_slots.json', 'utf8').replace(/^\uFEFF/, '');
  const allSlots = JSON.parse(raw);
  const test = allSlots.slice(0, 10);

  for (const s of test) {
    const slug = toSlug(s.name);
    const url = `https://slotcatalog.com/en/slots/${slug}`;
    console.log(`\n--- ${s.name} ---`);
    console.log(`URL: ${url}`);
    const html = await fetchPage(url);
    if (!html) {
      console.log('  FAILED: no HTML returned');
      continue;
    }
    console.log(`  HTML: ${html.length} bytes`);
    const data = parseSlotData(html);
    if (data) {
      console.log(`  RTP: ${data.rtp || 'n/a'}`);
      console.log(`  Vol: ${data.volatility || 'n/a'}`);
      console.log(`  MW:  ${data.max_win || 'n/a'}`);
    } else {
      // Debug: show what we can find
      console.log('  PARSE FAILED - debugging:');
      const hasRtp = html.includes('propLeft">RTP');
      const hasVar = html.includes('propLeft">Variance');
      const hasMW = html.includes('data-label="Max Win"');
      console.log(`  Has propLeft RTP: ${hasRtp}`);
      console.log(`  Has propLeft Variance: ${hasVar}`);
      console.log(`  Has data-label Max Win: ${hasMW}`);
      if (hasRtp) {
        const idx = html.indexOf('propLeft">RTP');
        console.log(`  RTP context: ${html.substring(idx, idx + 300)}`);
      }
    }
  }
}

main().catch(console.error);
