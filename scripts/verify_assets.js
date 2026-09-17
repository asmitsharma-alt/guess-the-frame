const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const s1Match = [...html.matchAll(/"content":\s*"(GUESSTHEFRAME\/[^"]+)"/g)].map(m => m[1]);
const eyeMatch = [...html.matchAll(/content:\s*'(GUESSTHEEYES\/[^']+)'/g)].map(m => m[1]);
const revealMatch = [...html.matchAll(/revealContent:\s*'(GUESSTHEEYES\/[^']+)'/g)].map(m => m[1]);
const tieMatch = [...html.matchAll(/"content":\s*"(tie breaker\/[^"]+)"/g)].map(m => m[1]);

const allAssets = [...new Set([...s1Match, ...eyeMatch, ...revealMatch, ...tieMatch])];
console.log(`Verifying ${allAssets.length} game assets:\n`);

let missing = 0;
for (const p of allAssets) {
  const rootPath = path.join(__dirname, '..', p);
  const sitePath = path.join(__dirname, '..', 'sites', 'guess-the-frame', p);

  const rootOk = fs.existsSync(rootPath);
  const siteOk = fs.existsSync(sitePath);

  if (!rootOk || !siteOk) {
    console.error(`[FAIL] ${p} (root: ${rootOk}, site: ${siteOk})`);
    missing++;
  } else {
    const sz = fs.statSync(rootPath).size;
    console.log(`[PASS] ${p} (${(sz / 1024).toFixed(1)} KB)`);
  }
}

if (missing === 0) {
  console.log(`\nSUCCESS: ALL ${allAssets.length} ASSETS VERIFIED ON DISK!`);
} else {
  console.error(`\nFAILURE: ${missing} missing assets!`);
  process.exit(1);
}
