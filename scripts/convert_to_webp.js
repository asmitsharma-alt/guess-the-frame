const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dirs = [
  path.join(__dirname, '..', 'GUESSTHEFRAME'),
  path.join(__dirname, '..', 'GUESSTHEEYES'),
  path.join(__dirname, '..', 'sites', 'guess-the-frame', 'GUESSTHEFRAME'),
  path.join(__dirname, '..', 'sites', 'guess-the-frame', 'GUESSTHEEYES')
];

async function convertDir(dir) {
  if (!fs.existsSync(dir)) return;
  console.log(`Converting images in ${dir}...`);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') continue;
    const fullPath = path.join(dir, file);
    const webpName = file.slice(0, -ext.length) + '.webp';
    const webpPath = path.join(dir, webpName);

    try {
      const origStat = fs.statSync(fullPath);
      await sharp(fullPath)
        .webp({ quality: 85, effort: 6 })
        .toFile(webpPath);
      const newStat = fs.statSync(webpPath);
      console.log(`  ${file} (${(origStat.size / 1024).toFixed(1)} KB) -> ${webpName} (${(newStat.size / 1024).toFixed(1)} KB) [${Math.round((1 - newStat.size / origStat.size) * 100)}% saved]`);
    } catch (err) {
      console.error(`  Failed on ${file}: ${err.message}`);
    }
  }
}

async function main() {
  for (const d of dirs) {
    await convertDir(d);
  }
  console.log('WebP conversion complete!');
}

main();
