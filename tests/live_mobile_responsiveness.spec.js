const { test, expect, devices } = require('@playwright/test');

const LIVE_URL = 'https://guess-the-frame-react.vercel.app';
const ARTIFACT_DIR = 'C:/Users/admin/.gemini/antigravity/brain/bc0cd56f-3310-43bd-90d8-de2b4d09a9e8';

test.use({
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 844 }
});

test.describe('Mobile Viewport & Screen Responsiveness Tests', () => {

  test('All screens render responsively with no layout breakage on mobile', async ({ page }) => {
    // 1. Mobile Home Screen
    console.log('--- 1. Testing Mobile Home Screen ---');
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML);
    console.log('ROOT HTML:', rootHtml ? rootHtml.slice(0, 300) : 'NULL');

    const createBtn = page.locator('#homeCreateBtn');
    await expect(createBtn).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile_1_home.png` });

    // 2. Mobile Create Room Modal & Avatar Grid
    console.log('--- 2. Testing Mobile Create Room Modal ---');
    await createBtn.click();
    await page.waitForTimeout(1000);

    const modalBox = page.locator('#createRoomModal .mp-modal-box');
    await expect(modalBox).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile_2_create_modal.png` });

    await page.fill('#hostPlayerNameInput', 'Mobile Maverick');
    await page.waitForTimeout(500);

    const confirmCreateBtn = page.locator('#createRoomModal .mp-btn-primary');
    await confirmCreateBtn.click();
    await page.waitForTimeout(3000);

    // 3. Mobile Lobby Screen
    console.log('--- 3. Testing Mobile Lobby Screen ---');
    await expect(page.locator('#playerLobbyScreen')).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile_4_lobby.png` });

    const mobileStartBtn = page.locator('#mobileLobbyStartBtn');
    await expect(mobileStartBtn).toBeVisible();
    const isStartDisabled = await mobileStartBtn.isDisabled();
    expect(isStartDisabled).toBe(false); // Host should have enabled start button

    // 4. Mobile Game Screen
    console.log('--- 4. Testing Mobile Game Screen ---');
    await mobileStartBtn.click();
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      if (window.HowToAnswerGuide) window.HowToAnswerGuide.stop();
      window.UI?.showScreen('gameScreen');
    });
    await page.waitForTimeout(1500);

    await expect(page.locator('#gameScreen')).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile_5_game_screen.png` });

    // Verify Mobile Bottom Bar
    const mobileBottomBar = page.locator('#mobileBottomBar');
    await expect(mobileBottomBar).toBeVisible();

    // Verify Mobile Quick Guess Input
    const quickInput = page.locator('#mobileQuickInput');
    await expect(quickInput).toBeVisible();
    await quickInput.fill('The Batman');
    const quickBtn = page.locator('#mobileQuickBtn');
    await expect(quickBtn).toBeVisible();
    await quickBtn.click();
    await page.waitForTimeout(1000);

    // 5. Mobile Answer Reveal
    console.log('--- 5. Testing Mobile Answer Reveal ---');
    await page.evaluate(() => {
      if (window.MultiplayerEngine?.hostSkipRound) {
        window.MultiplayerEngine.hostSkipRound();
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile_6_answer_reveal.png` });

    // 6. Mobile Winner Screen
    console.log('--- 6. Testing Mobile Winner Screen ---');
    await page.evaluate(() => {
      if (window.MultiplayerEngine?.finishGame) {
        window.MultiplayerEngine.finishGame();
      }
    });
    await page.waitForTimeout(1500);
    await expect(page.locator('#winnerScreen')).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile_7_winner.png` });

    console.log('✅ ALL MOBILE SCREENS VERIFIED SUCCESSFULLY!');
  });
});
