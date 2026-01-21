const fs = require('fs');
const path = 'src/components/PointsManager/PointsManager.jsx';
let content = fs.readFileSync(path, 'utf8');

// Remove all non-ASCII characters (keeps standard English text)
content = content.replace(/[^\x00-\x7F]/g, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Cleaned all non-ASCII characters!');
