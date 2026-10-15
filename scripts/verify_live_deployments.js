const https = require('https');

const vercelUrl = 'https://www.scoopcast-live.in';
const appwriteUrl = 'https://6a9a6a18002d67382503.appwrite.network';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- PROBING LIVE DEPLOYMENTS ---');

  console.log(`1. Probing Vercel: ${vercelUrl}`);
  const vRes = await fetchUrl(vercelUrl);
  console.log(`   Status: ${vRes.status}`);
  const vHasNewFrame = vRes.data.includes('13B Fear Has a New Address');
  const vHasPedroRule = vRes.data.includes('Pedro Ka Pyaasa');
  console.log(`   Contains new frames: ${vHasNewFrame}`);
  console.log(`   Contains Pedro Ka Pyaasa: ${vHasPedroRule}`);

  console.log(`\n2. Probing Appwrite: ${appwriteUrl}`);
  const aRes = await fetchUrl(appwriteUrl);
  console.log(`   Status: ${aRes.status}`);
  const aHasNewFrame = aRes.data.includes('13B Fear Has a New Address');
  const aHasPedroRule = aRes.data.includes('Pedro Ka Pyaasa');
  console.log(`   Contains new frames: ${aHasNewFrame}`);
  console.log(`   Contains Pedro Ka Pyaasa: ${aHasPedroRule}`);

  console.log(`\n3. Probing Live WebP Frame from Vercel...`);
  const frameSampleUrl = `${vercelUrl}/GUESSTHEFRAME/13B%20Fear%20Has%20a%20New%20Address%20(2009).webp`;
  const fRes = await fetchUrl(frameSampleUrl);
  console.log(`   Status: ${fRes.status}, Content-Type: ${fRes.headers['content-type']}, Size: ${fRes.headers['content-length']} bytes`);

  console.log(`\n4. Probing Live Eye WebP from Vercel...`);
  const eyeSampleUrl = `${vercelUrl}/GUESSTHEEYES/Pedro%20Ka%20Pyaasa.webp`;
  const eRes = await fetchUrl(eyeSampleUrl);
  console.log(`   Status: ${eRes.status}, Content-Type: ${eRes.headers['content-type']}, Size: ${eRes.headers['content-length']} bytes`);

  if (vRes.status === 200 && vHasNewFrame && vHasPedroRule && fRes.status === 200 && eRes.status === 200) {
    console.log('\nLIVE DEPLOYMENTS FULLY VERIFIED & HEALTHY!');
  } else {
    console.error('\nLIVE PROBE FAILED');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Probe error:', err);
  process.exit(1);
});
