const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processFrames() {
  const srcDir = 'GUESSTHEFRAME';
  const destDirs = ['GUESSTHEFRAME', 'sites/guess-the-frame/GUESSTHEFRAME'];
  destDirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
  console.log(`Processing ${files.length} frames...`);

  const results = [];
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    // Clean name: remove extra spaces before extension and convert to .webp
    let baseName = file.replace(/\s+\.(png|jpg|jpeg)$/i, '').replace(/\.(png|jpg|jpeg)$/i, '').trim();
    const destName = `${baseName}.webp`;

    const img = sharp(srcPath);
    const meta = await img.metadata();
    let pipeline = sharp(srcPath);
    if (meta.width && meta.width > 1920) {
      pipeline = pipeline.resize({ width: 1920, withoutEnlargement: true });
    }
    const buf = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();

    for (const d of destDirs) {
      fs.writeFileSync(path.join(d, destName), buf);
    }
    console.log(`  Frame done: ${file} -> ${destName} (${(buf.length / 1024).toFixed(1)} KB)`);
    results.push({ orig: file, webp: destName, sizeKb: (buf.length / 1024).toFixed(1) });
  }
  return results;
}

async function processEyes() {
  const srcDir = 'GUESSTHEEYES';
  const destDirs = ['GUESSTHEEYES', 'sites/guess-the-frame/GUESSTHEEYES'];
  destDirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
  console.log(`Processing ${files.length} eyes...`);

  const results = [];
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    let baseName = file.replace(/\s+\.(png|jpg|jpeg)$/i, '').replace(/\.(png|jpg|jpeg)$/i, '').trim();
    // Normalize unicode in case of combining accents like Zoë -> Zoe
    baseName = baseName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Zoe Kravitz
    const destName = `${baseName}.webp`;

    const img = sharp(srcPath);
    const meta = await img.metadata();
    let pipeline = sharp(srcPath);
    if (meta.width && meta.width > 1920) {
      pipeline = pipeline.resize({ width: 1920, withoutEnlargement: true });
    }
    const buf = await pipeline.webp({ quality: 84, effort: 4 }).toBuffer();

    for (const d of destDirs) {
      fs.writeFileSync(path.join(d, destName), buf);
    }
    console.log(`  Eye done: ${file} -> ${destName} (${(buf.length / 1024).toFixed(1)} KB)`);
    results.push({ orig: file, webp: destName, sizeKb: (buf.length / 1024).toFixed(1) });
  }
  return results;
}

async function run() {
  await processFrames();
  await processEyes();
  console.log('ALL ASSET OPTIMIZATION COMPLETE.');
}

run().catch(err => {
  console.error('ERROR in optimize_assets:', err);
  process.exit(1);
});
