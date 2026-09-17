const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SIZES = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '430x932', width: 430, height: 932 }
];

const OUT_DIR = path.join(__dirname, '..', 'recordings', 'mobile_audit');
const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\3beed2f4-bb6b-4eb9-ba09-1832e63da5d1';
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const sz of SIZES) {
    console.log(`\n=== Testing size: ${sz.name} ===`);
    const context = await browser.newContext({
      viewport: { width: sz.width, height: sz.height },
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8080/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Home Screen
    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_01_home.png`) });
    const homeOverflow = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        windowWidth: window.innerWidth,
        hasHScroll: document.body.scrollWidth > window.innerWidth,
        scrollHeight: document.body.scrollHeight,
        windowHeight: window.innerHeight
      };
    });
    console.log('Home screen overflow check:', homeOverflow);

    // 2. Create Modal
    await page.locator('.h-card-create').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_02_create_modal.png`) });

    // 3. Lobby Screen
    await page.locator('#hostPlayerNameInput').fill('Aman');
    await page.locator('#createRoomModal .mp-btn-primary').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_03_lobby.png`) });

    const lobbyOverflow = await page.evaluate(() => {
      const pl = document.getElementById('playerLobbyScreen');
      return {
        scrollWidth: pl ? pl.scrollWidth : 0,
        innerWidth: window.innerWidth,
        hasHScroll: pl ? pl.scrollWidth > window.innerWidth : false,
        lobbyStartBtnVis: !!document.getElementById('mobileLobbyStartBtn') && window.getComputedStyle(document.getElementById('mobileLobbyStartBtn')).display !== 'none'
      };
    });
    console.log('Lobby overflow check:', lobbyOverflow);

    // 4. Game Screen
    await page.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide.stop();
      UI.showScreen('gameScreen');
      const ogp = document.getElementById('onlineGuessPanel');
      if (ogp) ogp.classList.add('active');
      GS.framesLoaded = true;
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_04_game.png`) });

    const gameLayout = await page.evaluate(() => {
      const frame = document.querySelector('#imageContainer') || document.querySelector('.frame-image-container') || document.querySelector('.frame-display');
      const input = document.getElementById('mobileQuickInput');
      const bottomBar = document.getElementById('mobileBottomBar');
      const header = document.querySelector('#gameScreen .game-header');
      return {
        frameBounds: frame ? frame.getBoundingClientRect() : null,
        inputBounds: input ? input.getBoundingClientRect() : null,
        bottomBarBounds: bottomBar ? bottomBar.getBoundingClientRect() : null,
        headerBounds: header ? header.getBoundingClientRect() : null,
        bodyScrollWidth: document.body.scrollWidth,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      };
    });
    console.log('Game layout before keyboard:', gameLayout);

    // 5. Game Screen Keyboard Open Simulation
    // In Android Chrome, when keyboard opens, visualViewport shrinks and resize fires.
    const keyboardHeight = Math.round(sz.height * 0.4); // 40% of screen
    const visualHeight = sz.height - keyboardHeight;

    const mobileInput = page.locator('#mobileQuickInput');
    await mobileInput.focus();
    await page.evaluate((vh) => {
      document.documentElement.style.setProperty('--visual-vh', String(vh));
      document.body.classList.add('mobile-typing');
      document.body.classList.add('keyboard-visible');
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const gs = document.getElementById('gameScreen');
      if (gs) { gs.scrollTop = 0; }
    }, visualHeight);
    await page.setViewportSize({ width: sz.width, height: visualHeight });
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_05_game_keyboard.png`) });

    const gameKeyboardLayout = await page.evaluate(() => {
      const frame = document.querySelector('#imageContainer') || document.querySelector('.frame-image-container') || document.querySelector('.frame-display');
      const input = document.getElementById('mobileQuickInput');
      const bottomBar = document.getElementById('mobileBottomBar');
      const header = document.querySelector('#gameScreen .game-header');
      return {
        frameBounds: frame ? frame.getBoundingClientRect() : null,
        inputBounds: input ? input.getBoundingClientRect() : null,
        bottomBarBounds: bottomBar ? bottomBar.getBoundingClientRect() : null,
        headerBounds: header ? header.getBoundingClientRect() : null,
        visualHeight: window.innerHeight
      };
    });
    console.log('Game layout WITH keyboard:', gameKeyboardLayout);

    // Check if frame moved!
    if (gameLayout.frameBounds && gameKeyboardLayout.frameBounds) {
      const topDiff = Math.abs(gameLayout.frameBounds.top - gameKeyboardLayout.frameBounds.top);
      const heightDiff = Math.abs(gameLayout.frameBounds.height - gameKeyboardLayout.frameBounds.height);
      console.log(`FRAME MOVEMENT CHECK: topDiff=${topDiff}px, heightDiff=${heightDiff}px`);
    }

    // 6. Typing text
    await mobileInput.type('Interstellar');
    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_06_game_typed.png`) });

    // 7. Open Chat Drawer
    await page.setViewportSize({ width: sz.width, height: sz.height });
    await page.evaluate(() => {
      document.body.classList.remove('mobile-typing');
      document.body.classList.remove('keyboard-visible');
      document.documentElement.style.setProperty('--visual-vh', String(window.innerHeight));
      ChatEngine.toggleMobileDrawer(true);
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_07_chat_drawer.png`) });

    // 8. Answer Overlay / Frame Reveal
    await page.evaluate(() => {
      ChatEngine.toggleMobileDrawer(false); // close chat
      const ao = document.getElementById('answerOverlay');
      if (ao) {
        ao.style.display = 'flex';
        ao.classList.add('visible', 'active');
      }
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_08_answer_overlay.png`) });

    // 9. Winner Screen
    await page.evaluate(() => {
      const ao = document.getElementById('answerOverlay');
      if (ao) {
        ao.style.display = 'none';
        ao.classList.remove('visible', 'active');
      }
      WinnerScreen.show([
        { name: 'AMAN', score: 30, avatar: 'aman' },
        { name: 'AMISH', score: 15, avatar: 'amish' },
        { name: 'AZIZ', score: 10, avatar: 'aziz' },
        { name: 'VISH', score: 5, avatar: 'vish' }
      ]);
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, `${sz.name}_09_winner.png`) });

    await context.close();
  }

  await browser.close();

  try {
    if (fs.existsSync(ARTIFACT_DIR)) {
      ['360x800_03_lobby.png', '360x800_04_game.png', '360x800_05_game_keyboard.png', '360x800_09_winner.png'].forEach(f => {
        const src = path.join(OUT_DIR, f);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(ARTIFACT_DIR, f));
        }
      });
    }
  } catch (e) { console.error('Error copying to ARTIFACT_DIR:', e); }

  console.log('\nAudit complete! Screenshots in', OUT_DIR);
})();
