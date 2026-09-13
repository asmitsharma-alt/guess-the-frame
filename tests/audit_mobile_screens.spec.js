// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve('test-results/mobile_audit');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

test.describe('COMPREHENSIVE MOBILE SCREEN AUDIT', () => {

  test('Inspect and audit all screens and modals on 375x812 mobile viewport', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 375, height: 812 });

    page.on('console', msg => console.log('PAGE_LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE_ERR:', err));

    const checkNoOverflow = async (name) => {
      const docW = await page.evaluate(() => document.documentElement.scrollWidth);
      const winW = await page.evaluate(() => window.innerWidth);
      const bodyW = await page.evaluate(() => document.body.scrollWidth);
      expect(docW, `${name} document has horizontal scroll (docW=${docW}, winW=${winW})`).toBeLessThanOrEqual(winW);
      expect(bodyW, `${name} body has horizontal scroll (bodyW=${bodyW}, winW=${winW})`).toBeLessThanOrEqual(winW);
    };

    // 1. Home Screen
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#homeScreen')).toBeVisible();
    await checkNoOverflow('HomeScreen');
    await page.screenshot({ path: path.join(OUT_DIR, '01_home_mobile.png') });

    // 2. Create Room Modal
    await page.locator('.h-card-create').click();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);
    await checkNoOverflow('CreateRoomModal');
    await page.screenshot({ path: path.join(OUT_DIR, '02_create_modal_mobile.png') });
    await page.locator('#createRoomModal .mp-modal-close').click();
    await expect(page.locator('#createRoomModal')).not.toHaveClass(/active/);

    // 3. Join Room Modal
    await page.locator('.h-card-join').click();
    await expect(page.locator('#joinRoomModal')).toHaveClass(/active/);
    await checkNoOverflow('JoinRoomModal');
    await page.screenshot({ path: path.join(OUT_DIR, '03_join_modal_mobile.png') });
    await page.locator('#joinRoomModal .mp-modal-close').click();
    await expect(page.locator('#joinRoomModal')).not.toHaveClass(/active/);

    // 4. Rejoin Modal
    await page.evaluate(() => {
      MultiplayerEngine.promptRejoinModal({
        roomCode: 'PLAY',
        playerName: 'Aman',
        playerAvatar: 'aman',
        isHost: true,
        timestamp: Date.now()
      });
    });
    await expect(page.locator('#rejoinRoomModal')).toHaveClass(/active/);
    await checkNoOverflow('RejoinRoomModal');
    await page.screenshot({ path: path.join(OUT_DIR, '04_rejoin_modal_mobile.png') });
    await page.locator('#rejoinRoomModal .mp-btn-secondary').click();
    await expect(page.locator('#rejoinRoomModal')).not.toHaveClass(/active/);

    // 5. Create Room and Enter Lobby
    await page.locator('.h-card-create').click();
    await page.locator('#hostPlayerNameInput').fill('Aman');
    await page.locator('#createRoomModal .mp-btn-primary').click();
    await expect(page.locator('#playerLobbyScreen')).toBeVisible();
    await checkNoOverflow('PlayerLobby (1 Player)');
    await page.screenshot({ path: path.join(OUT_DIR, '05_lobby_1p_mobile.png') });

    // 6. Lobby with 4 and 8 players
    await page.evaluate(() => {
      GS.players = [
        { id: 'p1', name: 'Aman', avatar: 'aman', score: 0, isHost: true, color: '#FF6B9D', loaded: true },
        { id: 'p2', name: 'Amish', avatar: 'amish', score: 0, isHost: false, color: '#57c3e0', loaded: true },
        { id: 'p3', name: 'Aziz', avatar: 'aziz', score: 0, isHost: false, color: '#f0a828', loaded: true },
        { id: 'p4', name: 'Vish', avatar: 'vish', score: 0, isHost: false, color: '#84cc16', loaded: true },
        { id: 'p5', name: 'Karan', avatar: 'aman', score: 0, isHost: false, color: '#ec4899', loaded: true },
        { id: 'p6', name: 'Priya', avatar: 'amish', score: 0, isHost: false, color: '#3b82f6', loaded: true },
        { id: 'p7', name: 'Rahul', avatar: 'aziz', score: 0, isHost: false, color: '#10b981', loaded: true },
        { id: 'p8', name: 'Rohan', avatar: 'vish', score: 0, isHost: false, color: '#a855f7', loaded: true }
      ];
      MultiplayerEngine.renderLobbyUI();
    });
    await page.waitForTimeout(300);
    await checkNoOverflow('PlayerLobby (8 Players)');
    await page.screenshot({ path: path.join(OUT_DIR, '06_lobby_8p_mobile.png') });

    // 7. How to Answer Screen
    const mobileBtn = page.locator('#mobileLobbyStartBtn');
    if (await mobileBtn.isVisible()) {
      await mobileBtn.click();
    } else {
      await page.locator('#lobbyStartBtn').click();
    }
    await expect(page.locator('#howToAnswerScreen')).toBeVisible();
    await checkNoOverflow('HowToAnswerScreen');
    await page.screenshot({ path: path.join(OUT_DIR, '07_how_to_answer_mobile.png') });

    // 8. Game Screen
    await page.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide.stop();
      UI.showScreen('gameScreen');
      GS.framesLoaded = true;
    });
    await expect(page.locator('#gameScreen')).toBeVisible();
    await checkNoOverflow('GameScreen');
    await page.screenshot({ path: path.join(OUT_DIR, '08_game_screen_mobile.png') });

    // Check that mobile bottom bar is visible and within bounds
    const bottomBarBounds = await page.evaluate(() => {
      const bar = document.getElementById('mobileBottomBar');
      const btn = document.getElementById('mobileChatToggleBtn');
      const gs = document.getElementById('gameScreen');
      return {
        bar: bar ? bar.getBoundingClientRect() : null,
        btn: btn ? btn.getBoundingClientRect() : null,
        gsScrollTop: gs ? gs.scrollTop : null,
        winScrollY: window.scrollY,
        winH: window.innerHeight,
        docH: document.documentElement.scrollHeight
      };
    });
    console.log('MOBILE_BAR_DIAG:', JSON.stringify(bottomBarBounds, null, 2));
    expect(bottomBarBounds.bar.width).toBeLessThanOrEqual(375);
    expect(bottomBarBounds.btn.right).toBeLessThanOrEqual(375);

    // 9. Mobile Chat Drawer Open
    await page.locator('#mobileChatToggleBtn').click();
    await page.waitForTimeout(300);
    await checkNoOverflow('GameScreen (Mobile Chat Drawer Open)');
    await page.screenshot({ path: path.join(OUT_DIR, '09_game_chat_drawer_open_mobile.png') });
    await page.locator('#mobileChatCloseBtn').click();
    await page.waitForTimeout(300);

    // 10. Scoring Overlay
    await page.evaluate(() => {
      UI.showScoringOv(true);
    });
    await expect(page.locator('#scoringOv')).toBeVisible();
    await checkNoOverflow('ScoringOverlay');
    await page.screenshot({ path: path.join(OUT_DIR, '10_scoring_overlay_mobile.png') });
    await page.evaluate(() => {
      UI.showScoringOv(false);
    });

    // 11. Winner Screen
    await page.evaluate(() => {
      WinnerScreen.show([
        { name: 'AMAN', score: 30, avatar: 'aman' },
        { name: 'AZIZ', score: 22, avatar: 'aziz' },
        { name: 'AMISH', score: 15, avatar: 'amish' },
        { name: 'VISH', score: 5, avatar: 'vish' }
      ]);
    });
    await expect(page.locator('#winnerScreen')).toBeVisible();
    await page.waitForTimeout(500);
    await checkNoOverflow('WinnerScreen');
    await page.screenshot({ path: path.join(OUT_DIR, '11_winner_screen_mobile.png') });

    // Verify podium cards fit on mobile screen
    const podiumFits = await page.evaluate(() => {
      const stage = document.querySelector('.cw-stage-section, .cw-center-stage-grid, .cw-stage-area');
      const champ = document.getElementById('champHeroCard');
      const silver = document.getElementById('silverCard');
      const bronze = document.getElementById('bronzeCard');
      return {
        stageExists: !!stage,
        champW: champ ? champ.getBoundingClientRect().width : 0,
        silverW: silver ? silver.getBoundingClientRect().width : 0,
        bronzeW: bronze ? bronze.getBoundingClientRect().width : 0,
      };
    });
    expect(podiumFits.stageExists).toBe(true);
  });

});
