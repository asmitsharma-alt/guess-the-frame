const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIRS = [
  path.join(__dirname, '..', 'GUESSTHEFRAME'),
  path.join(__dirname, '..', 'GUESSTHEEYES'),
  path.join(__dirname, '..', 'sites', 'guess-the-frame', 'GUESSTHEFRAME'),
  path.join(__dirname, '..', 'sites', 'guess-the-frame', 'GUESSTHEEYES')
];

async function convertDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory does not exist: ${dirPath}`);
    return;
  }
  const files = fs.readdirSync(dirPath);
  console.log(`\nProcessing directory: ${dirPath} (${files.length} files)`);

  let totalOldBytes = 0;
  let totalNewBytes = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') continue;

    const inputPath = path.join(dirPath, file);
    const baseName = path.basename(file, ext);
    const outputPath = path.join(dirPath, `${baseName}.webp`);

    const stat = fs.statSync(inputPath);
    totalOldBytes += stat.size;

    console.log(`Converting ${file} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);

    await sharp(inputPath)
      .webp({ quality: 85, effort: 4 })
      .toFile(outputPath);

    const newStat = fs.statSync(outputPath);
    totalNewBytes += newStat.size;

    console.log(`  -> ${baseName}.webp: ${(newStat.size / 1024).toFixed(1)} KB (Saved ${((1 - newStat.size / stat.size) * 100).toFixed(1)}%)`);
  }

  console.log(`\nFinished ${dirPath}:`);
  console.log(`  Original: ${(totalOldBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  New WebP: ${(totalNewBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Total Saved: ${((1 - totalNewBytes / totalOldBytes) * 100).toFixed(1)}%`);
}

async function main() {
  for (const d of DIRS) {
    await convertDir(d);
  }
}

main().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
