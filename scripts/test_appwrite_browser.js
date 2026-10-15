const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(__dirname, '..', file);
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200);
    res.end(content);
  } catch(e) {
    res.writeHead(404);
    res.end();
  }
}).listen(8085, async () => {
  console.log('Test server running on port 8085');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8085');

  const res = await page.evaluate(async () => {
    try {
      const client = new Appwrite.Client();
      client.setEndpoint('https://sgp.cloud.appwrite.io/v1').setProject('6a95a01e0028db20a16f');
      const account = new Appwrite.Account(client);
      let session;
      try {
        session = await account.get();
      } catch(e) {
        session = await account.createAnonymousSession();
      }
      const databases = new Appwrite.Databases(client);
      const rooms = await databases.listDocuments('guess_the_frame', 'rooms', []);
      return { success: true, userId: session.userId, roomCount: rooms.total };
    } catch(e) {
      return { success: false, error: e.message, stack: e.stack };
    }
  });

  console.log('Appwrite Browser Verification Result:', res);
  await browser.close();
  server.close();
  process.exit(0);
});
