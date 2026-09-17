const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Find all screen elements
const screens = [];
const screenRegex = /<div[^>]*id="([^"]+)"[^>]*class="[^"]*screen[^"]*"[^>]*>/gi;
let match;
while ((match = screenRegex.exec(html)) !== null) {
  screens.push(match[1]);
}

console.log('Screens found:', screens);

// Find all modals
const modals = [];
const modalRegex = /<div[^>]*id="([^"]+modal[^"]*)"[^>]*>/gi;
while ((match = modalRegex.exec(html)) !== null) {
  modals.push(match[1]);
}
console.log('Modals found:', modals);

// Check viewport meta tag
const viewportMeta = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
console.log('Viewport Meta:', viewportMeta ? viewportMeta[0] : 'None');
