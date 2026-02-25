// Debug script to find exact HTML patterns for slot data
import https from 'https';

function fetchFull(url) {
  return new Promise((resolve) => {
    https.get(url, {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}}, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', () => resolve(''));
    });
  });
}

const html = await fetchFull('https://slotcatalog.com/en/slots/Sweet-Bonanza');
console.log('Total HTML length:', html.length);

// Search for 96.51 (known RTP)
const rtpValIdx = html.indexOf('96.51');
if (rtpValIdx > -1) {
  console.log('\n=== RTP Value Context (500 chars before) ===');
  console.log(html.substring(Math.max(0, rtpValIdx - 200), rtpValIdx + 100));
}

// Search for "Med-High"
const mhIdx = html.indexOf('Med-High');
if (mhIdx > -1) {
  console.log('\n=== Med-High Context ===');
  console.log(html.substring(Math.max(0, mhIdx - 200), mhIdx + 100));
}

// Search for "propLeft" near RTP
const propRtpIdx = html.indexOf('RTP');
console.log('\nAll RTP occurrences:');
let idx = 0;
let count = 0;
while ((idx = html.indexOf('RTP', idx)) !== -1 && count < 20) {
  const context = html.substring(Math.max(0, idx - 30), idx + 80).replace(/\n/g, ' ');
  if (context.includes('propLeft') || context.includes('data-label') || context.includes('%')) {
    console.log(`  [${idx}]: ${context}`);
  }
  idx++;
  count++;
}

// Look for propLeft > RTP
const allPropLeft = [...html.matchAll(/propLeft[^>]*>([^<]+)/g)];
console.log('\nAll propLeft values:');
for (const m of allPropLeft) {
  console.log('  ', m[1].trim());
}

// Look for propRight with percentages
const allPropRight = [...html.matchAll(/propRight[^>]*>[\s\S]*?<\/td>/g)].slice(0, 15);
console.log('\nFirst 15 propRight values:');
for (const m of allPropRight) {
  const text = m[0].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  console.log('  ', text.substring(0, 120));
}
