import { readFileSync, writeFileSync } from 'fs';

const filePath = './src/components/AdminPanel/AdminPanel.jsx';
let content = readFileSync(filePath, 'utf8');

// Each entry: [corrupted string (as it appears in file), correct emoji]
// Identified by reading raw UTF-8 codepoints from the file
const fixes = [
  // 🛡️ admin/shield — "ƒøí´©Å" with soft-hyphen prefix
  ['\u00AD\u0192\u00F8\u00ED\u00B4\u00A9\u00C5', '🛡️'],
  // 👥 users — "ƒæÑ"
  ['\u00AD\u0192\u00E6\u00D1', '👥'],
  // 🎰 slot/casino — "ƒÄ░"
  ['\u00AD\u0192\u00C4\u2591', '🎰'],
  // 🔑 api keys — "ƒöæ"
  ['\u00AD\u0192\u00F6\u00E6', '🔑'],
  // 🏠 landing page — "ƒÅá"
  ['\u00AD\u0192\u00C5\u00E1', '🏠'],
  // ⚠️ moderators — "ÔÜö´©Å"
  ['\u00D4\u00DC\u00F6\u00B4\u00A9\u00C5', '⚠️'],
  // 💎 premium — "ƒææ"
  ['\u00AD\u0192\u00E6\u00E6', '💎'],
  // ✅ active users
  ['\u00D4\u00A3\u00F4', '✅'],
  // 🎁 gift/bonus — "ƒÄü"
  ['\u00AD\u0192\u00C4\u00FC', '🎁'],
  // 💰 money/deposit — "ƒÆ░"
  ['\u00AD\u0192\u00C6\u2591', '💰'],
  // 💸 cashback — "ƒÆ©"
  ['\u00AD\u0192\u00C6\u00A9', '💸'],
  // 👁️ visible/active eye — "ƒæü´©Å"
  ['\u00AD\u0192\u00E6\u00FC\u00B4\u00A9\u00C5', '👁️'],
  // ❌ inactive — "ƒÜ½"
  ['\u00AD\u0192\u00DC\u00BD', '❌'],
  // 🗑️ delete — "ƒùæ´©Å"
  ['\u00AD\u0192\u00F9\u00E6\u00B4\u00A9\u00C5', '🗑️'],
  // 🔄 refresh — "ƒöä"
  ['\u00AD\u0192\u00F6\u00E4', '🔄'],
  // 🌍 global/country — "ƒîì"
  ['\u00AD\u0192\u00EE\u008C', '🌍'],
  // 🎡 daily wheel — "ƒÄí"
  ['\u00AD\u0192\u00C4\u00ED', '🎡'],
  // 🎲 probability/dice — "ƒÄ▓"
  ['\u00AD\u0192\u00C4\u2592', '🎲'],
  // 📊 analytics/chart — "ƒôè"
  ['\u00AD\u0192\u00F4\u00E8', '📊'],
  // 🏰 casino brand — "ƒÅø´©Å"
  ['\u00AD\u0192\u00C5\u00F8\u00B4\u00A9\u00C5', '🏰'],
  // 🔒 hidden/lock — "ƒöÆ"
  ['\u00AD\u0192\u00F6\u00C6', '🔒'],
  // 🔐 generate password — "ƒöÉ"
  ['\u00AD\u0192\u00F6\u00C9', '🔐'],
  // 📋 copy — "ƒôï"
  ['\u00AD\u0192\u00F4\u00EF', '📋'],
  // 📰 cards — "ƒôª"
  ['\u00AD\u0192\u00F4\u00AA', '📰'],
  // 🎯 enter results — "ƒÄ»"
  ['\u00AD\u0192\u00C4\u00BB', '🎯'],
  // 💡 guesses — "ƒÆ¡"
  ['\u00AD\u0192\u00C6\u00A1', '💡'],
  // 🗳️ votes — "ƒù│´©Å"
  ['\u00AD\u0192\u00F9\u2502\u00B4\u00A9\u00C5', '🗳️'],
  // 🏆 trophy/winner — "ƒÅå"
  ['\u00AD\u0192\u00C5\u00E5', '🏆'],
  // ⏳ loading — "ÔÅ│"
  ['\u00D4\u00C5\u2502', '⏳'],
  // 🟢 green circle/active — "ƒƒó"
  ['\u00AD\u0192\u0192\u00F3', '🟢'],
  // 🔧 moderator wrench — "ƒöº"
  ['\u00AD\u0192\u00F6\u00BA', '🔧'],
  // ✖️ close button — "Ô£ò"
  ['\u00D4\u00A3\u00F2', '✖️'],
  // ✏️ edit button — "Ô£Å´©Å"
  ['\u00D4\u00A3\u00C5\u00B4\u00A9\u00C5', '✏️'],
  // ❌ inactive/cross — "Ô£ù"
  ['\u00D4\u00A3\u00F9', '❌'],
  // ✅ active/completed/open — "Ô£à"
  ['\u00D4\u00A3\u00E0', '✅'],
  // ➕ create/add — "Ô×ò"
  ['\u00D4\u00D7\u00F2', '➕'],
  // ⭐ star/premium/super — "Ô¡É"
  ['\u00D4\u00A1\u00C9', '⭐'],
  // ⚠️ warning — "ÔÜá´©Å"
  ['\u00D4\u00DC\u00E1\u00B4\u00A9\u00C5', '⚠️'],
  // 🚫 cancelled — "ÔØî"
  ['\u00D4\u00D8\u00EE', '🚫'],
  // 🔒 guessing closed — "ÔÅ©´©Å"
  ['\u00D4\u00C5\u00A9\u00B4\u00A9\u00C5', '🔒'],
  // ⚙️ settings/gear — "ÔÜÖ´©Å"
  ['\u00D4\u00DC\u00D6\u00B4\u00A9\u00C5', '⚙️'],
  // € euro sign — "Ôé¼"
  ['\u00D4\u00E9\u00BC', '€'],
  // — em dash — "ÔÇö"
  ['\u00D4\u00C7\u00F6', '\u2014'],
  // • bullet — "ÔÇó"
  ['\u00D4\u00C7\u00F3', '\u2022'],
  // – en dash — "ÔÇô"
  ['\u00D4\u00C7\u00F4', '\u2013'],
  // … ellipsis — "ÔÇª"
  ['\u00D4\u00C7\u00AA', '\u2026'],
  // ▼ expand arrow — "Ôû╝"
  ['\u00D4\u00FB\u255D', '\u25BC'],
  // ▶ collapse arrow — "ÔûÂ"
  ['\u00D4\u00FB\u00C2', '\u25B6'],
  // ─ horizontal rule (comments only) — "ÔöÇ"
  ['\u00D4\u00F6\u00C7', '\u2500'],
  // 🌍 country/global — corrected codepoints for "ƒîì"
  ['\u00AD\u0192\u00EE\u00EC', '🌍'],
  // 🎲 probability/dice — corrected codepoints for "ƒÄ▓"
  ['\u00AD\u0192\u00C4\u2593', '🎲'],
  // 💵 money settings — "ƒÆÁ"
  ['\u00AD\u0192\u00C6\u00C1', '💵'],
  // 💾 save — "ƒÆ¥"
  ['\u00AD\u0192\u00C6\u00A5', '💾'],
  // 👍 best — "ƒæì"
  ['\u00AD\u0192\u00E6\u00EC', '👍'],
  // 👎 worst — "ƒæÄ"
  ['\u00AD\u0192\u00E6\u00C4', '👎'],
];

let replacedCount = 0;
for (const [from, to] of fixes) {
  if (content.includes(from)) {
    content = content.split(from).join(to);
    console.log(`✓ Replaced: U+${[...from].map(c=>c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join(' ')} → ${to}`);
    replacedCount++;
  } else {
    console.log(`✗ Not found: → ${to}`);
  }
}

console.log(`\nTotal: ${replacedCount}/${fixes.length} replacements made`);
writeFileSync(filePath, content, 'utf8');
console.log('File written.');
