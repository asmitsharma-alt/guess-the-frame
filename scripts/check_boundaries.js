const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const startMarker = 'const MultiplayerEngine = {';
const endMarker = '/* ═══ EXACT REPLICA: AAA COMIC VICTORY WINNER CONTROLLER ═══ */';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

console.log('startIdx:', startIdx);
console.log('endIdx:', endIdx);
console.log('Slice before endMarker:\n', content.slice(endIdx - 100, endIdx));
