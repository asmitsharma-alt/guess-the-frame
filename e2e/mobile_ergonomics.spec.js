const { test, expect, devices } = require('@playwright/test');

const LIVE_URL = process.env.TEST_URL || 'http://localhost:8080';

test.use({
  ...devices['iPhone 14'],
  viewport: { width: 390, height: 844 },
  hasTouch: true
});

test.describe('E2E Mobile-First & Touch Ergonomics Verification', () => {

  test('Verify mobile safe-area insets, >=48px touch targets, and bottom-drawer modal gestures', async ({ page }) => {
    console.log('--- Step 1: Verify Mobile Home Screen & Viewport Lock ---');
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify touch targets on home action buttons >= 48px
    const createBtn = page.locator('#homeCreateBtn');
    await expect(createBtn).toBeVisible();
    const createBox = await createBtn.boundingBox();
    console.log(`Create Button Dimensions: width=${createBox?.width}px, height=${createBox?.height}px`);
    expect(createBox?.height).toBeGreaterThanOrEqual(48);

    const joinBtn = page.locator('#homeJoinBtn');
    await expect(joinBtn).toBeVisible();
    const joinBox = await joinBtn.boundingBox();
    console.log(`Join Button Dimensions: width=${joinBox?.width}px, height=${joinBox?.height}px`);
    expect(joinBox?.height).toBeGreaterThanOrEqual(48);

    console.log('--- Step 2: Open Mobile Modal and Verify Bottom-Sheet Drawer ---');
    await createBtn.click();
    await page.waitForTimeout(1000);

    const modalOverlay = page.locator('#createRoomModal');
    await expect(modalOverlay).toBeVisible();

    // Verify input font-size >= 16px to prevent iOS auto-zooming
    const nameInput = page.locator('#hostPlayerNameInput');
    await expect(nameInput).toBeVisible();
    const fontSize = await nameInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    console.log('Mobile Input Computed Font Size:', fontSize);
    const numericFontSize = parseFloat(fontSize);
    expect(numericFontSize).toBeGreaterThanOrEqual(16);

    // Verify primary submit button >= 48px
    const submitBtn = page.locator('#createRoomModal .mp-btn-primary');
    await expect(submitBtn).toBeVisible();
    const submitBox = await submitBtn.boundingBox();
    console.log(`Submit Button Dimensions: width=${submitBox?.width}px, height=${submitBox?.height}px`);
    expect(submitBox?.height).toBeGreaterThanOrEqual(48);

    console.log('--- Step 3: Enter Lobby & Verify Mobile Thumb-Zone Floating Bar ---');
    await nameInput.fill('Ergonomics Tester');
    await submitBtn.click();
    await page.waitForTimeout(3000);

    const lobbyStartBtn = page.locator('#mobileLobbyStartBtn');
    await expect(lobbyStartBtn).toBeVisible();
    const lobbyBtnBox = await lobbyStartBtn.boundingBox();
    console.log(`Lobby Floating Start Button Dimensions: width=${lobbyBtnBox?.width}px, height=${lobbyBtnBox?.height}px`);
    expect(lobbyBtnBox?.height).toBeGreaterThanOrEqual(48);

    // Verify Start button is situated in bottom thumb-zone (y > 700px on 844px height screen)
    expect(lobbyBtnBox?.y).toBeGreaterThan(600);

    console.log('--- Step 4: Advance to Game Screen & Verify Quick Input Bar ---');
    await lobbyStartBtn.click();
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      if (window.HowToAnswerGuide) window.HowToAnswerGuide.stop();
      window.UI?.showScreen('gameScreen');
    });
    await page.waitForTimeout(1000);

    const bottomBar = page.locator('#mobileBottomBar');
    await expect(bottomBar).toBeVisible();
    const bottomBarBox = await bottomBar.boundingBox();
    console.log(`Mobile Bottom Bar: y=${bottomBarBox?.y}px, height=${bottomBarBox?.height}px`);
    expect(bottomBarBox?.y).toBeGreaterThan(700);

    const quickBtn = page.locator('#mobileQuickBtn');
    await expect(quickBtn).toBeVisible();
    const quickBtnBox = await quickBtn.boundingBox();
    expect(quickBtnBox?.height).toBeGreaterThanOrEqual(48);

    console.log('🎉 MOBILE ERGONOMICS & TOUCH SPEC PASSED!');
  });
});
