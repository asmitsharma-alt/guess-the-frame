const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processLogo() {
  const pngPath = path.resolve('bg/guess_the_frame.png');
  const webpPath = path.resolve('bg/guess_the_frame.webp');
  const siteBgDir = path.resolve('sites/guess-the-frame/bg');

  if (!fs.existsSync(siteBgDir)) {
    fs.mkdirSync(siteBgDir, { recursive: true });
  }

  // Generate webp from png with high quality
  await sharp(pngPath).webp({ quality: 92 }).toFile(webpPath);
  console.log('Generated bg/guess_the_frame.webp');

  // Copy png and webp to sites/guess-the-frame/bg
  fs.copyFileSync(pngPath, path.join(siteBgDir, 'guess_the_frame.png'));
  fs.copyFileSync(webpPath, path.join(siteBgDir, 'guess_the_frame.webp'));
  console.log('Copied guess_the_frame.png and guess_the_frame.webp to sites/guess-the-frame/bg');
}

processLogo().catch(console.error);
