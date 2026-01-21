const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/PointsManager/PointsManager.jsx');

// Read as buffer first
let buffer = fs.readFileSync(filePath);

// Convert to string - try different encodings if needed
let content = buffer.toString('utf8');

const originalLength = content.length;

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
  console.log('Removed BOM');
}

// The mojibake patterns we found - these are characters that were originally UTF-8
// but got corrupted. Let's identify and replace them:

// Pattern for warning emoji âš  (U+26A0 encoded in Latin-1 looking)
// â = 0xe2, š = 0x161 (but should be 0x9a), and 0xa0
// This is UTF-8 bytes E2 9A A0 read incorrectly

// Let's just do a simple clean - replace all non-ASCII with appropriate ASCII
const replacements = [
  // Warning sign patterns
  [/â[š\u0161][\s\u00a0]/g, '[!] '],
  [/â[š\u0161][\s\u00a0]ï¸[\u008f]/g, '[!] '],
  // Em dash patterns  
  [/â€["\u201d]/g, '-'],
  // Right arrow patterns
  [/â[†\u2020]['\u2019]/g, '>'],
  // X mark patterns
  [/â[œ\u0153][•\u2022]/g, 'X'],
  // Gift emoji patterns
  [/ð[Ÿ\u0178][Ž\u017d][\u0081]/g, '*'],
];

for (const [pattern, replacement] of replacements) {
  content = content.replace(pattern, replacement);
}

// Final pass - remove any remaining non-ASCII characters
content = content.replace(/[^\x00-\x7F]/g, '');

fs.writeFileSync(filePath, content, 'utf8');

console.log('File cleaned successfully!');
console.log('Original length:', originalLength);
console.log('Clean length:', content.length);
console.log('Characters removed:', originalLength - content.length);
