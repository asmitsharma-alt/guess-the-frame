// One-off asset optimizer. Usage: node scripts/optimize_perf_assets.js
// - avatars: re-encode the embedded 1000px PNG as 512px WebP inside the same SVG wrapper (no code changes needed)
// - qr.png: 1254px/973KB -> 512px palette PNG
// - cinema_bg.webp: 4K -> 1920px
// - og_image.jpg: 1200x630 social preview (social crawlers do not reliably support webp)
const fs = require('fs');
const sharp = require('sharp');
const kb = f => Math.round(fs.statSync(f).size / 1024) + 'KB';

(async () => {
  for (const n of ['aman', 'amish', 'aziz', 'vish']) {
    const f = `avvtar/${n}.svg`;
    const before = kb(f);
    const svg = fs.readFileSync(f, 'utf8');
    const m = svg.match(/data:image\/png;base64,([A-Za-z0-9+\/=]+)/);
    if (!m) { console.log(f, 'no embedded png, skipped'); continue; }
    const webp = await sharp(Buffer.from(m[1], 'base64')).resize(512, 512, { fit: 'cover' }).webp({ quality: 86, effort: 6 }).toBuffer();
    fs.writeFileSync(f, svg.replace(m[0], 'data:image/webp;base64,' + webp.toString('base64')));
    console.log(f, before, '->', kb(f));
  }

  const qrBefore = kb('qr.png');
  const qr = await sharp('qr.png').resize(512, 512, { fit: 'inside', kernel: 'nearest' }).png({ palette: true, colors: 16, compressionLevel: 9 }).toBuffer();
  fs.writeFileSync('qr.png', qr);
  console.log('qr.png', qrBefore, '->', kb('qr.png'));

  const bgBefore = kb('bg/cinema_bg.webp');
  const bg = await sharp('bg/cinema_bg.webp').resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 72, effort: 6 }).toBuffer();
  fs.writeFileSync('bg/cinema_bg.webp', bg);
  console.log('bg/cinema_bg.webp', bgBefore, '->', kb('bg/cinema_bg.webp'));

  const logo = await sharp('bg/guess_the_frame.webp').resize({ height: 560 }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#FFFDF5' } })
    .composite([{ input: logo, gravity: 'centre' }])
    .jpeg({ quality: 82, mozjpeg: true }).toFile('bg/og_image.jpg');
  console.log('bg/og_image.jpg', kb('bg/og_image.jpg'));
})();
