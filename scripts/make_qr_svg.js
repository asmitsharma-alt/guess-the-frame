const QRCode = require('qrcode');
const fs = require('fs');

async function run() {
  const url = 'https://asmit.scoopcast.me';
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#111827',
      light: '#FFFFFF'
    }
  });
  fs.writeFileSync('scripts/qr_asmit.svg', svg);
  console.log('Generated scripts/qr_asmit.svg');
}
run();
