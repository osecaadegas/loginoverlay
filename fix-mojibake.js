const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/PointsManager/PointsManager.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const originalLength = content.length;

// Common mojibake patterns from UTF-8 misinterpretation
// These are UTF-8 bytes read as Windows-1252 or similar
const replacements = {
  // Warning sign (U+26A0)
  '\u00e2\u0161\u00a0': '[!]',
  '\u00e2\u0161\u00a0\u00ef\u00b8\u008f': '[!]',
  // Em dash (U+2014)
  '\u00e2\u0080\u0094': '-',
  // Right arrow (U+2192)
  '\u00e2\u0086\u0092': '>',
  // Multiplication X (U+2715)
  '\u00e2\u009c\u0095': 'X',
  // Gift emoji (U+1F381) - 4 byte UTF-8
  '\u00f0\u009f\u008e\u0081': '*',
};

// Also try hex patterns
const hexReplacements = [
  [/\xc3\xa2\xc5\xa1\xc2\xa0/g, '[!]'],         // warning
  [/\xc3\xa2\xc5\xa1\xc2\xa0\xc3\xaf\xc2\xb8\xc2\x8f/g, '[!]'], // warning with variation selector
  [/\xc3\xa2\xe2\x80\x9a\xc2\xa0/g, '[!]'],     // another warning variant
  [/\xc3\xa2\xe2\x80\x9a\xc2\xa0\xc3\xaf\xc2\xb8\xc2\x8f/g, '[!]'], // warning variant with vs
  [/\xc3\xa2\xe2\x82\xac\xe2\x80\x9c/g, '-'],   // em dash
  [/\xc3\xa2\xe2\x80\xa0\xe2\x80\x99/g, '>'],   // right arrow
  [/\xc3\xa2\xc5\x93\xe2\x80\xa2/g, 'X'],       // multiplication X
  [/\xc3\xb0\xc5\xb8\xc5\xbd\xc2\x81/g, '*'],   // gift emoji
];

// Apply named replacements
for (const [find, replace] of Object.entries(replacements)) {
  content = content.split(find).join(replace);
}

// Apply regex replacements
for (const [regex, replace] of hexReplacements) {
  content = content.replace(regex, replace);
}

// Final cleanup - remove any remaining non-ASCII
content = content.replace(/[^\x00-\x7F]/g, '');

fs.writeFileSync(filePath, content, 'utf8');

console.log('File cleaned!');
console.log('Original length:', originalLength);
console.log('Clean length:', content.length);
console.log('Removed chars:', originalLength - content.length);
