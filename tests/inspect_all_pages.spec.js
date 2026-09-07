const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(__dirname, '../test-results/page_inspections');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('FULL APPLICATION PAGE & SCREEN INSPECTOR', () => {

  test('Inspect All Pages & Screens on Desktop (1280x720)', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1280, height: 720 });

    // ──────────────────────────────────────────────────────────────────────────
    // 1. HOME SCREEN
    // ──────────────────────────────────────────────────────────────────────────
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const homeScreen = page.locator('#homeScreen');
    await expect(homeScreen).toBeVisible();
    await expect(page.locator('.h-logo-img')).toBeVisible();
    await expect(page.locator('.h-filmstrip')).toBeVisible();
    await expect(page.locator('.h-card-create')).toBeVisible();
    await expect(page.locator('.h-card-join')).toBeVisible();
    await expect(page.locator('#sndBtn')).toBeVisible();

    // Verify no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasHorizontalScroll).toBe(false);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home_screen_desktop.png') });

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CREATE ROOM MODAL
    // ──────────────────────────────────────────────────────────────────────────
    await page.locator('.h-card-create').click();
    const createModal = page.locator('#createRoomModal');
    await expect(createModal).toHaveClass(/active/);
    await expect(page.locator('#hostPlayerNameInput')).toBeVisible();
    await expect(page.locator('#createRoomModal .mp-avatar-grid')).toBeVisible();
    await expect(page.locator('#createRoomModal .mp-btn-primary')).toBeVisible();

    await page.locator('#hostPlayerNameInput').fill('Commander');
    await page.locator('#createRoomModal .mp-avatar-option[data-avatar="aman"]').click();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_create_modal_desktop.png') });
    await page.locator('#createRoomModal .mp-modal-close').click();
    await expect(createModal).not.toHaveClass(/active/);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. JOIN ROOM MODAL
    // ──────────────────────────────────────────────────────────────────────────
    await page.locator('.h-card-join').click();
    const joinModal = page.locator('#joinRoomModal');
    await expect(joinModal).toHaveClass(/active/);
    await expect(page.locator('#joinPlayerNameInput')).toBeVisible();
    await expect(page.locator('#joinCodeInput')).toBeVisible();
    await expect(page.locator('#joinRoomModal .mp-avatar-grid')).toBeVisible();

    await page.locator('#joinPlayerNameInput').fill('Spock');
    await page.locator('#joinCodeInput').fill('KIRK');
    await page.locator('#joinRoomModal .mp-avatar-option[data-avatar="aziz"]').click();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_join_modal_desktop.png') });
    await page.locator('#joinRoomModal .mp-modal-close').click();
    await expect(joinModal).not.toHaveClass(/active/);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. REJOIN PROMPT MODAL
    // ──────────────────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      MultiplayerEngine.promptRejoinModal({
        roomCode: 'STAR',
        playerName: 'Commander',
        playerAvatar: 'aman',
        isHost: true,
        timestamp: Date.now()
      });
    });
    const rejoinModal = page.locator('#rejoinRoomModal');
    await expect(rejoinModal).toHaveClass(/active/);
    await expect(page.locator('#rejoinRoomCodeText')).toHaveText('STAR');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_rejoin_modal_desktop.png') });
    await page.locator('#rejoinRoomModal .mp-btn-secondary').click();
    await expect(rejoinModal).not.toHaveClass(/active/);

    // ──────────────────────────────────────────────────────────────────────────
    // 5. PLAYER LOBBY SCREEN & QR MODAL
    // ──────────────────────────────────────────────────────────────────────────
    await page.locator('.h-card-create').click();
    await page.locator('#hostPlayerNameInput').fill('Commander');
    await page.locator('#createRoomModal .mp-btn-primary').click();

    const lobbyScreen = page.locator('#playerLobbyScreen');
    await expect(lobbyScreen).toBeVisible();
    await expect(page.locator('#lobbyStartBtn')).toBeVisible();

    // Test QR Code modal
    const qrBtn = page.locator('button:has-text("QR Code")');
    if (await qrBtn.count() > 0) {
      await qrBtn.click();
      const qrModal = page.locator('#qrModal');
      await expect(qrModal).toHaveClass(/active/);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_lobby_qr_modal_desktop.png') });
      await page.locator('#qrModal .mp-modal-close').click();
      await expect(qrModal).not.toHaveClass(/active/);
    }

    // Add multiple players to lobby to inspect 4-player layout
    await page.evaluate(() => {
      GS.framesLoaded = true;
      GS.players = [
        { id: 'p1', name: 'COMMANDER', avatar: 'aman', score: 0, isHost: true, color: '#ff7eb6', loaded: true },
        { id: 'p2', name: 'AMISH', avatar: 'amish', score: 0, isHost: false, color: '#57c3e0', loaded: true },
        { id: 'p3', name: 'AZIZ', avatar: 'aziz', score: 0, isHost: false, color: '#f0a828', loaded: true },
        { id: 'p4', name: 'VISH', avatar: 'vish', score: 0, isHost: false, color: '#84cc16', loaded: true }
      ];
      MultiplayerEngine.renderLobbyUI();
      const btn = document.getElementById('lobbyStartBtn');
      if (btn) btn.disabled = false;
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_lobby_4_players_desktop.png') });

    // ──────────────────────────────────────────────────────────────────────────
    // 6. HOW TO ANSWER GUIDE SCREEN
    // ──────────────────────────────────────────────────────────────────────────
    await page.locator('#lobbyStartBtn').click();
    const htaScreen = page.locator('#howToAnswerScreen');
    await expect(htaScreen).toBeVisible();
    await expect(page.locator('#htaTimerCount')).toBeVisible();

    const htaHostStartBtn = page.locator('#htaHostStartBtn');
    await expect(htaHostStartBtn).toBeDisabled();

    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_how_to_answer_desktop.png') });

    // Fast-forward countdown to test unlocked button state
    await page.evaluate(() => { HowToAnswerGuide._secondsLeft = 1; });
    await page.waitForTimeout(1200);
    await expect(htaHostStartBtn).toBeEnabled();

    // ──────────────────────────────────────────────────────────────────────────
    // 7. GAME ARENA SCREEN
    // ──────────────────────────────────────────────────────────────────────────
    await htaHostStartBtn.click();
    const gameScreen = page.locator('#gameScreen');
    await expect(gameScreen).toBeVisible();

    // Verify host bar, canvas, chat, leaderboard
    await expect(page.locator('#hostFloatingBar')).toBeVisible();
    await expect(page.locator('#hfbHintBtn')).toBeVisible();
    await expect(page.locator('#hfbPauseBtn')).toBeVisible();
    await expect(page.locator('#hfbSkipBtn')).toBeVisible();
    await expect(page.locator('#liveChatStream')).toBeVisible();

    // Emulate chat message and winner banner
    await page.evaluate(() => {
      ChatEngine.renderMessage({
        id: 'msg_inspect_1',
        senderId: 'p2',
        senderName: 'AMISH',
        senderAvatar: 'amish',
        text: 'This movie looks legendary!'
      });
      ChatEngine.renderWinnerBanner({
        playerId: 'p2',
        playerName: 'AMISH',
        avatar: 'amish',
        position: 1,
        points: 10
      });
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_game_arena_desktop.png') });

    // ──────────────────────────────────────────────────────────────────────────
    // 8. ANSWER REVEAL OVERLAY
    // ──────────────────────────────────────────────────────────────────────────
    await page.locator('#hfbSkipBtn').click();
    const answerOverlay = page.locator('#answerOverlay');
    await expect(answerOverlay).toBeVisible();
    await expect(page.locator('#ansTitle')).toBeVisible();
    await expect(page.locator('#ansNextRoundBtn')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_answer_reveal_desktop.png') });

    // ──────────────────────────────────────────────────────────────────────────
    // 9. WINNER SCREEN
    // ──────────────────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      WinnerScreen.show([
        { name: 'COMMANDER', score: 30, avatar: 'aman' },
        { name: 'AZIZ', score: 22, avatar: 'aziz' },
        { name: 'AMISH', score: 15, avatar: 'amish' },
        { name: 'VISH', score: 5, avatar: 'vish' }
      ]);
    });

    const winnerScreen = page.locator('#winnerScreen');
    await expect(winnerScreen).toBeVisible();
    await expect(page.locator('.cw-victory-title')).toBeVisible();
    await expect(page.locator('.cw-msg-card')).toBeVisible();
    await expect(page.locator('#champHeroCard')).toBeVisible();
    await expect(page.locator('#silverCard')).toBeVisible();
    await expect(page.locator('#bronzeCard')).toBeVisible();
    await expect(page.locator('.cw-scoreboard-card')).toBeVisible();
    await expect(page.locator('.cw-credits-pill-bar')).toBeVisible();
    await expect(page.locator('.cw-buttons-deck')).toBeVisible();

    // Verify sound button is hidden on winner screen
    await expect(page.locator('#sndBtn')).toBeHidden();

    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_winner_screen_desktop.png') });

    // Click Return to Lobby
    await page.locator('.btn-lobby').click();
    await expect(lobbyScreen).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_returned_lobby_desktop.png') });
  });

  test('Inspect Key Pages on Mobile Viewport (375x812 iPhone)', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 375, height: 812 });

    // 1. Mobile Home Screen
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#homeScreen')).toBeVisible();
    const hasHorizontalScrollHome = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasHorizontalScrollHome).toBe(false);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_home_screen_mobile.png') });

    // 2. Mobile Create Modal
    await page.locator('.h-card-create').click();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_create_modal_mobile.png') });
    await page.locator('#createRoomModal .mp-btn-primary').click();

    // 3. Mobile Player Lobby
    await expect(page.locator('#playerLobbyScreen')).toBeVisible();
    const hasHorizontalScrollLobby = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasHorizontalScrollLobby).toBe(false);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_player_lobby_mobile.png') });

    // 4. Mobile How To Answer Screen
    const mobileBtn = page.locator('#mobileLobbyStartBtn');
    const desktopBtn = page.locator('#lobbyStartBtn');
    if (await mobileBtn.isVisible()) {
      await mobileBtn.click();
    } else {
      await desktopBtn.click();
    }

    await expect(page.locator('#howToAnswerScreen')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_how_to_answer_mobile.png') });

    // 5. Mobile Winner Screen
    await page.evaluate(() => {
      WinnerScreen.show([
        { name: 'AMAN', score: 30, avatar: 'aman' },
        { name: 'AZIZ', score: 12, avatar: 'aziz' },
        { name: 'AMISH', score: 8, avatar: 'amish' }
      ]);
    });
    await expect(page.locator('#winnerScreen')).toBeVisible();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16_winner_screen_mobile.png') });
  });

});
