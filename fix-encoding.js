const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/PointsManager/PointsManager.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all non-ASCII with empty string
const cleanContent = content.replace(/[^\x00-\x7F]/g, '');

fs.writeFileSync(filePath, cleanContent, 'utf8');

console.log('File cleaned!');
console.log('Original length:', content.length);
console.log('Clean length:', cleanContent.length);
console.log('Removed chars:', content.length - cleanContent.length);
