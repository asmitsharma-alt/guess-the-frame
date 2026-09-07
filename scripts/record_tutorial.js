const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RECORD_DIR = path.resolve(__dirname, '../recordings');
if (!fs.existsSync(RECORD_DIR)) {
  fs.mkdirSync(RECORD_DIR, { recursive: true });
}

// Helper for human-like delay
const delay = ms => new Promise(r => setTimeout(r, ms));

async function moveAndClick(page, selector, clickDelay = 400) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout: 8000 });
  const box = await element.boundingBox();
  if (!box) return;

  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  // Move cursor smoothly
  await page.evaluate(({ x, y }) => {
    if (window.__updateCursor) window.__updateCursor(x, y);
  }, { x: targetX, y: targetY });

  await delay(clickDelay);

  // Trigger ripple
  await page.evaluate(({ x, y }) => {
    if (window.__triggerRipple) window.__triggerRipple(x, y);
  }, { x: targetX, y: targetY });

  await element.click({ force: true });
  await delay(200);
}

async function typeText(page, selector, text, keyDelay = 90) {
  const element = page.locator(selector).first();
  await moveAndClick(page, selector, 200);
  await delay(150);
  for (const char of text) {
    await element.pressSequentially(char, { delay: keyDelay });
  }
  await delay(300);
}

(async () => {
  console.log('🎬 Starting Screen Recording Session for Tutorial Video...');

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: RECORD_DIR,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  // Inject virtual cursor styling & mechanics
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.innerHTML = `
        #virtual-cursor {
          position: fixed;
          width: 24px;
          height: 24px;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 2147483647;
          transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
          transform: translate3d(640px, 360px, 0);
        }
        #virtual-cursor-pointer {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));
        }
        .click-ripple {
          position: fixed;
          border: 3px solid #ff3b30;
          border-radius: 50%;
          pointer-events: none;
          z-index: 2147483646;
          animation: rippleEffect 0.55s ease-out forwards;
        }
        @keyframes rippleEffect {
          0% { width: 4px; height: 4px; opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { width: 50px; height: 50px; opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
        }
      `;
      document.head.appendChild(style);

      const cursor = document.createElement('div');
      cursor.id = 'virtual-cursor';
      cursor.innerHTML = `
        <svg id="virtual-cursor-pointer" viewBox="0 0 24 24" fill="none">
          <path d="M4 2L20 10L12 12L10 20L4 2Z" fill="#ff3b30" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      `;
      document.body.appendChild(cursor);

      window.__updateCursor = (x, y) => {
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      };

      window.__triggerRipple = (x, y) => {
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      };
    });
  });

  await page.goto('http://localhost:8080/');
  await page.waitForLoadState('networkidle');
  await delay(1200);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENE 1: Home Screen (Welcome to Guess The Frame)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📍 Scene 1: Home Screen Showcase');
  await page.evaluate(() => window.__updateCursor(640, 280));
  await delay(1200);

  // Hover over Create Room Card
  await page.evaluate(() => window.__updateCursor(440, 480));
  await delay(1000);

  // Click "HOST A ROOM"
  await moveAndClick(page, '.h-card-create', 500);
  await delay(800);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENE 2: Create Room Modal (Choose Name & Avatar)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📍 Scene 2: Setup Room & Character');
  await typeText(page, '#hostPlayerNameInput', 'Aman');
  await delay(400);

  // Select Avatar (Aman)
  await moveAndClick(page, '#createRoomModal .mp-avatar-option[data-avatar="aman"]', 400);
  await delay(600);

  // Click Create Room
  await moveAndClick(page, '#createRoomModal .mp-btn-primary', 500);
  await delay(1200);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENE 3: Player Lobby & Inviting Friends
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📍 Scene 3: Lobby & Joining Friends');
  await delay(1000);

  // Open QR Code Modal
  await moveAndClick(page, 'button:has-text("QR Code")', 500);
  await delay(1500);

  // Close QR Code Modal
  await moveAndClick(page, '#qrModal .mp-modal-close', 400);
  await delay(800);

  // Add 3 friends to the room
  await page.evaluate(() => {
    GS.players = [
      { id: 'p1', name: 'Aman', avatar: 'aman', score: 0, isHost: true, color: '#ff6b9d', loaded: true },
      { id: 'p2', name: 'Amish', avatar: 'amish', score: 0, isHost: false, color: '#3b82f6', loaded: true },
      { id: 'p3', name: 'Aziz', avatar: 'aziz', score: 0, isHost: false, color: '#84cc16', loaded: true },
      { id: 'p4', name: 'Vish', avatar: 'vish', score: 0, isHost: false, color: '#facc15', loaded: true }
    ];
    MultiplayerEngine.renderLobbyUI();
    const btn = document.getElementById('lobbyStartBtn');
    if (btn) btn.disabled = false;
  });
  await delay(2000);

  // Click "START GAME"
  await moveAndClick(page, '#lobbyStartBtn', 600);
  await delay(1200);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENE 4: 3-Step Playbook Guide ("How to Play")
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📍 Scene 4: 3-Step Arcade Playbook Guide');
  await page.evaluate(() => window.__updateCursor(640, 360));
  await delay(2000);

  // Fast forward countdown smoothly to 1s
  await page.evaluate(() => {
    HowToAnswerGuide._secondsLeft = 1;
  });
  await delay(1400);

  // Click "START ROUND 1"
  await moveAndClick(page, '#htaHostStartBtn', 500);
  await delay(3600); // Allow round splash overlay to finish and fade

  // ──────────────────────────────────────────────────────────────────────────
  // SCENE 5: Active Round Gameplay & Live Chat Guessing
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📍 Scene 5: Active Guessing in Live Chat');
  await page.evaluate(() => {
    const ov = document.getElementById('roundIntroOv');
    if (ov) ov.classList.remove('on');
    UI.renderLB();
  });
  await delay(1200);

  // Move cursor to live chat input
  await typeText(page, '#chatTextInput', 'Hera Pheri', 100);
  await delay(400);
  await moveAndClick(page, '#chatSendBtn', 300);

  // Simulate correct answer confirmation banner and points
  await page.evaluate(() => {
    ChatEngine.renderWinnerBanner({
      playerId: 'p1',
      playerName: 'Aman',
      avatar: 'aman',
      position: 1,
      points: 10
    });
    // Update Aman's score to 10
    const aman = GS.players.find(p => p.name.toLowerCase() === 'aman');
    if (aman) aman.score = 10;
    UI.renderLB();
  });
  await delay(2000);

  // Click Hint Button to demonstrate clue feature
  await moveAndClick(page, '#chatHintBtn', 500);
  await page.evaluate(() => {
    ChatEngine.renderPersonalHintMessage('H _ _ A   P _ _ _ I');
    const pill = document.getElementById('chatActiveHint');
    const text = document.getElementById('chatActiveHintText');
    if (pill && text) {
      pill.style.display = 'block';
      text.textContent = 'H _ _ A   P _ _ _ I';
    }
  });
  await delay(2500);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENE 6: Scoring Overlay & Leaderboard Award
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📍 Scene 6: Scoring Overlay & Point Distribution');
  await page.evaluate(() => {
    // Show answer reveal card
    const ao = document.getElementById('answerOverlay');
    const at = document.getElementById('ansTitle');
    const ay = document.getElementById('ansYear');
    const ad = document.getElementById('ansDialogue');
    if (ao) ao.style.display = 'flex';
    if (at) at.textContent = 'Hera Pheri';
    if (ay) ay.textContent = '2000 • Directed by Priyadarshan';
    if (ad) ad.textContent = '"Yeh Baburao ka style hai!"';
  });
  await delay(2200);

  // Host opens scoring overlay
  await page.evaluate(() => {
    const ao = document.getElementById('answerOverlay');
    if (ao) ao.style.display = 'none';
    UI.showScoringOv(true);
  });
  await delay(1200);

  // Host clicks Aman's button on the scoring grid
  await moveAndClick(page, '#scoringGrid .spbtn[data-pi="0"]', 600);
  await page.evaluate(() => {
    const aman = GS.players.find(p => p.name.toLowerCase() === 'aman');
    if (aman) aman.score = 30;
    const amish = GS.players.find(p => p.name.toLowerCase() === 'amish');
    if (amish) amish.score = 15;
    const aziz = GS.players.find(p => p.name.toLowerCase() === 'aziz');
    if (aziz) aziz.score = 10;
    const vish = GS.players.find(p => p.name.toLowerCase() === 'vish');
    if (vish) vish.score = 5;
    UI.renderLB();
  });
  await delay(2000);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENE 7: Grand Victory Celebration & Winner Podium
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📍 Scene 7: Grand Winner Screen Celebration');
  await page.evaluate(() => {
    UI.showScoringOv(false);
    WinnerScreen.show([
      { name: 'AMAN', score: 30, avatar: 'aman' },
      { name: 'AMISH', score: 15, avatar: 'amish' },
      { name: 'AZIZ', score: 10, avatar: 'aziz' },
      { name: 'VISH', score: 5, avatar: 'vish' }
    ]);
  });
  await delay(1200);

  // Trigger celebration confetti
  await page.evaluate(() => {
    if (WinnerScreen.triggerPopper) {
      WinnerScreen.triggerPopper('left');
      setTimeout(() => WinnerScreen.triggerPopper('right'), 300);
    }
  });

  // Hover around winner podium & cards
  await page.evaluate(() => window.__updateCursor(640, 420));
  await delay(1800);
  await page.evaluate(() => window.__updateCursor(420, 520));
  await delay(1200);
  await page.evaluate(() => window.__updateCursor(860, 520));
  await delay(2500);

  console.log('🎉 Tutorial Walkthrough Complete! Saving Video...');

  // Close context to finalize video writing
  await context.close();
  await browser.close();

  // Find the generated video in recordings/
  const videoFiles = fs.readdirSync(RECORD_DIR).filter(f => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const latestVideo = videoFiles.map(f => ({
      name: f,
      time: fs.statSync(path.join(RECORD_DIR, f)).mtimeMs
    })).sort((a, b) => b.time - a.time)[0].name;

    const rawPath = path.join(RECORD_DIR, latestVideo);
    const targetPath = path.join(RECORD_DIR, 'raw_tutorial.webm');
    fs.copyFileSync(rawPath, targetPath);
    console.log(`✅ Raw recording saved to: ${targetPath}`);
  } else {
    console.error('❌ No video file recorded.');
  }
})();
