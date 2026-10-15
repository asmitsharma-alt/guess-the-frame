const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8089;
const OUT_DIR = path.resolve('test-results/audit_before');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Minimal static file server for local testing
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, '..', req.url.split('?')[0]);
  if (req.url === '/' || req.url === '') filePath = path.join(__dirname, '..', 'index.html');

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  });
});

async function run() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Test server running on http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const breakpoints = [
    { name: '320_mobile_se', width: 320, height: 568 },
    { name: '375_mobile_standard', width: 375, height: 667 },
    { name: '768_tablet_port', width: 768, height: 1024 },
    { name: '1024_tablet_land', width: 1024, height: 768 },
    { name: '1440_desktop', width: 1440, height: 900 },
    { name: '1920_fhd', width: 1920, height: 1080 }
  ];

  for (const bp of breakpoints) {
    console.log(`\n--- Capturing Breakpoint: ${bp.name} (${bp.width}x${bp.height}) ---`);
    const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 1. Home Screen
    await page.screenshot({ path: path.join(OUT_DIR, `home_${bp.name}.png`), fullPage: false });

    // 2. Create Modal
    await page.evaluate(() => {
      MultiplayerEngine.openCreateModal();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `modal_create_${bp.name}.png`) });

    // 3. Join Modal
    await page.evaluate(() => {
      MultiplayerEngine.closeModals();
      MultiplayerEngine.openJoinModal();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `modal_join_${bp.name}.png`) });

    // 4. Lobby Screen with 5 players (including long names)
    await page.evaluate(() => {
      MultiplayerEngine.closeModals();
      UI.showScreen('playerLobbyScreen');
      MultiplayerEngine.roomCode = '7K9X';
      MultiplayerEngine.isHost = true;
      GS.players = [
        { id: 'p1', name: 'Ayank The Retro Master', avatar: 'ayank', score: 0, isHost: true, loaded: true, color: '#ff7eb6' },
        { id: 'p2', name: 'Ayush Cinema Buff', avatar: 'ayush', score: 0, isHost: false, loaded: true, color: '#57c3e0' },
        { id: 'p3', name: 'Joel Fast Guesser', avatar: 'joel', score: 0, isHost: false, loaded: true, color: '#84cc16' },
        { id: 'p4', name: 'Praggya Bollywood Expert', avatar: 'praggya', score: 0, isHost: false, loaded: true, color: '#facc15' },
        { id: 'p5', name: 'Ruhaan Challenger 99', avatar: 'ruhaan', score: 0, isHost: false, loaded: true, color: '#ff6b6b' }
      ];
      PlayerLobby.render();
      if (UI.updateLoadProgress) UI.updateLoadProgress({ loaded: 18, total: 40, percent: 45 }, 'lobby');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, `lobby_5players_${bp.name}.png`) });

    // 5. Game Screen with 5 players, long chat, timer
    await page.evaluate(() => {
      UI.showScreen('gameScreen');
      GS.players[0].score = 40;
      GS.players[1].score = 30;
      GS.players[2].score = 25;
      GS.players[3].score = 15;
      GS.players[4].score = 10;
      UI.renderLB();
      document.getElementById('timerTxt').textContent = '22';
      
      const chatBox = document.getElementById('chatMessageList');
      if (chatBox) {
        chatBox.innerHTML = `
          <div class="chat-msg"><span class="chat-sender">Ayank:</span> <span class="chat-text">Is this Gangs of Wasseypur?</span></div>
          <div class="chat-msg"><span class="chat-sender">Ayush:</span> <span class="chat-text">Yeh dialogue Sholay ka lag raha hai bhai pakka!</span></div>
          <div class="chat-msg system-msg"><span class="chat-text">⚡ ROUND 04: GUESS THE DIALOGUE</span></div>
          <div class="chat-msg correct-msg"><span class="chat-text">🎉 Joel scored +10 PTS!</span></div>
          <div class="chat-msg"><span class="chat-sender">Praggya:</span> <span class="chat-text">उम्मीद है कि सबको मज़ा आ रहा होगा गेम में!</span></div>
        `;
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, `game_5players_${bp.name}.png`) });

    // 6. Winner Screen
    await page.evaluate(() => {
      UI.showScreen('winnerScreen');
      WinnerScreen.show(GS.players);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `winner_${bp.name}.png`) });

    await page.close();
  }

  await browser.close();
  server.close();
  console.log('\nAll baseline before screenshots captured successfully in:', OUT_DIR);
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
