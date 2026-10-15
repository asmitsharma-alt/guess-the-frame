const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const targetDirs = [
  path.join(__dirname, '..', 'GUESSTHEEYES'),
  path.join(__dirname, '..', 'sites', 'guess-the-frame', 'GUESSTHEEYES')
];

async function convertDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return;
  }
  console.log(`\nProcessing directory: ${dir}`);
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
      continue;
    }
    
    const baseName = path.basename(file, ext);
    const inputPath = path.join(dir, file);
    const outputPath = path.join(dir, `${baseName}.webp`);
    
    const inputStat = fs.statSync(inputPath);
    
    try {
      await sharp(inputPath)
        .rotate()
        .webp({ quality: 85, effort: 6 })
        .toFile(outputPath);
      
      const outputStat = fs.statSync(outputPath);
      const savings = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);
      console.log(`Converted: "${file}" (${(inputStat.size / 1024).toFixed(1)} KB) -> "${baseName}.webp" (${(outputStat.size / 1024).toFixed(1)} KB, -${savings}%)`);
    } catch (err) {
      console.error(`Failed to convert "${file}":`, err.message);
    }
  }
}

async function main() {
  for (const dir of targetDirs) {
    await convertDir(dir);
  }
  console.log('\nAll GUESSTHEEYES files successfully converted to WebP!');
}

main();
