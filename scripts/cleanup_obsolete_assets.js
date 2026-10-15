const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html', 'utf8');
const assetMatches = [...html.matchAll(/(GUESSTHEFRAME\/[^"']+\.webp|GUESSTHEEYES\/[^"']+\.webp)/g)];
const activeAssets = new Set(assetMatches.map(m => m[1].replace(/\\/g, '/')));

console.log('Active assets count:', activeAssets.size);

function cleanDir(siteDir, prefix) {
  const files = fs.readdirSync(siteDir);
  let removed = 0;
  for (const f of files) {
    const rel = `${prefix}/${f}`;
    if (!activeAssets.has(rel)) {
      console.log(`Removing obsolete: ${rel}`);
      fs.unlinkSync(path.join(siteDir, f));
      removed++;
    }
  }
  console.log(`Removed ${removed} obsolete files from ${siteDir}`);
}

cleanDir('sites/guess-the-frame/GUESSTHEFRAME', 'GUESSTHEFRAME');
cleanDir('sites/guess-the-frame/GUESSTHEEYES', 'GUESSTHEEYES');
console.log('Site directory cleanup complete.');
