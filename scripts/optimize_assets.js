const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const targetDirs = [
  path.join(__dirname, '..', 'GUESSTHEFRAME'),
  path.join(__dirname, '..', 'GUESSTHEEYES'),
  path.join(__dirname, '..', 'sites', 'guess-the-frame', 'GUESSTHEFRAME'),
  path.join(__dirname, '..', 'sites', 'guess-the-frame', 'GUESSTHEEYES'),
];

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') return;

  const stat = fs.statSync(filePath);
  if (stat.size < 400 * 1024) return; // Skip small images already under 400KB

  try {
    const inputBuffer = fs.readFileSync(filePath);
    let pipeline = sharp(inputBuffer).resize({ width: 1600, withoutEnlargement: true });

    let outputBuffer;
    if (ext === '.png') {
      outputBuffer = await pipeline.png({ quality: 80, compressionLevel: 9, effort: 7 }).toBuffer();
    } else {
      outputBuffer = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    }

    if (outputBuffer.length < stat.size) {
      fs.writeFileSync(filePath, outputBuffer);
      console.log(`Optimized: ${path.basename(filePath)} (${(stat.size / 1024 / 1024).toFixed(2)}MB -> ${(outputBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
    }
  } catch (err) {
    console.error(`Error optimizing ${filePath}:`, err.message);
  }
}

async function run() {
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;
    console.log(`\nScanning ${dir}...`);
    const files = fs.readdirSync(dir);
    for (const file of files) {
      await optimizeFile(path.join(dir, file));
    }
  }
  console.log('\nOptimization complete!');
}

run();
