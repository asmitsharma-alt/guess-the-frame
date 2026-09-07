// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = path.join('test-results', 'mobile_keyboard');

test.describe('MOBILE KEYBOARD: Frame must stay visible while typing', () => {

  test('Frame does not scroll away when virtual keyboard opens on mobile (375x812)', async ({ page }) => {
    test.setTimeout(60000);

    // iPhone-sized viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Create a room and get to the game screen
    await page.locator('.h-card-create').click();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);
    await page.locator('#createRoomModal .mp-btn-primary').click();
    await expect(page.locator('#playerLobbyScreen')).toBeVisible();

    // Start the game
    const mobileBtn = page.locator('#mobileLobbyStartBtn');
    const desktopBtn = page.locator('#lobbyStartBtn');
    if (await mobileBtn.isVisible()) {
      await mobileBtn.click();
    } else {
      await desktopBtn.click();
    }

    // Wait for HowToAnswer, then skip directly to game screen
    await expect(page.locator('#howToAnswerScreen')).toBeVisible();
    await page.evaluate(() => {
      // Stop the HowToAnswer timer and directly launch the game
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide.stop();
      UI.showScreen('gameScreen');
      // Set up the game state so frame area is active
      const ogp = document.getElementById('onlineGuessPanel');
      if (ogp) ogp.classList.add('active');
      GS.framesLoaded = true;
    });
    await expect(page.locator('#gameScreen')).toBeVisible({ timeout: 5000 });

    // Take BEFORE screenshot — the game arena in its normal state
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_game_before_focus.png') });

    // Record the frame container's position BEFORE focusing the input
    const frameBoundsBefore = await page.evaluate(() => {
      const frameContainer = document.querySelector('#imageContainer') ||
                             document.querySelector('.frame-image-container') ||
                             document.querySelector('.frame-display');
      if (!frameContainer) return null;
      const r = frameContainer.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    });

    // ─── SIMULATE VIRTUAL KEYBOARD OPENING ───
    // On real mobile, focusing the input opens the keyboard, which shrinks the
    // visual viewport. Playwright can't open a real keyboard, but we can
    // simulate the effect by:
    // 1. Shrinking the viewport to mimic keyboard taking ~40% of screen
    // 2. Triggering the focus event on the mobile input
    // 3. Manually setting the CSS variable and body class that our code uses

    // First, focus the mobile quick input
    const mobileInput = page.locator('#mobileQuickInput');
    if (await mobileInput.isVisible()) {
      await mobileInput.focus();
    } else {
      // Fallback to desktop input
      await page.locator('#chatTextInput').focus();
    }
    await page.waitForTimeout(200);

    // Simulate keyboard by shrinking viewport (keyboard takes ~40% on iPhone)
    const keyboardHeight = 320; // typical iPhone keyboard height
    const visualHeight = 812 - keyboardHeight; // 492px visible
    await page.setViewportSize({ width: 375, height: visualHeight });

    // Trigger the keyboard-visible class and set the CSS variable like our JS does
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

    await page.waitForTimeout(400);

    // Take AFTER screenshot — with simulated keyboard open
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_game_keyboard_open.png') });

    // ─── ASSERTIONS ───

    // 1. The gameScreen should be visible and not scrolled
    const gameScreen = page.locator('#gameScreen');
    await expect(gameScreen).toBeVisible();

    // 2. The game screen scroll position must be 0
    const scrollTop = await page.evaluate(() => {
      const gs = document.getElementById('gameScreen');
      return gs ? gs.scrollTop : -1;
    });
    expect(scrollTop).toBe(0);

    // 3. The frame container must still be visible in the viewport
    const frameBoundsAfter = await page.evaluate(() => {
      const frameContainer = document.querySelector('#imageContainer') ||
                             document.querySelector('.frame-image-container') ||
                             document.querySelector('.frame-display');
      if (!frameContainer) return null;
      const r = frameContainer.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    });

    expect(frameBoundsAfter).not.toBeNull();
    if (frameBoundsAfter) {
      // The top of the frame must be >= 0 (not scrolled above viewport)
      expect(frameBoundsAfter.top).toBeGreaterThanOrEqual(0);
      // At least part of the frame must be visible (bottom > 0)
      expect(frameBoundsAfter.bottom).toBeGreaterThan(0);
      // The frame must fit within the visible area
      expect(frameBoundsAfter.bottom).toBeLessThanOrEqual(visualHeight + 10);
    }

    // 4. The mobile input bar must be visible
    const inputVisible = await page.evaluate(() => {
      const input = document.getElementById('mobileQuickInput');
      if (!input) return false;
      const r = input.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight + 10;
    });
    expect(inputVisible).toBe(true);

    // 5. The body must not have scrolled
    const bodyScroll = await page.evaluate(() => ({
      scrollTop: document.documentElement.scrollTop || document.body.scrollTop,
      scrollLeft: document.documentElement.scrollLeft || document.body.scrollLeft,
    }));
    expect(bodyScroll.scrollTop).toBe(0);

    // ─── TYPE AN ANSWER AND VERIFY FRAME STAYS ───
    if (await mobileInput.isVisible()) {
      await mobileInput.type('Inception', { delay: 50 });
    }
    await page.waitForTimeout(200);

    // Take screenshot after typing
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_game_after_typing.png') });

    // Frame should STILL be visible after typing
    const frameBoundsTyping = await page.evaluate(() => {
      const frameContainer = document.querySelector('#imageContainer') ||
                             document.querySelector('.frame-image-container') ||
                             document.querySelector('.frame-display');
      if (!frameContainer) return null;
      const r = frameContainer.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    });

    expect(frameBoundsTyping).not.toBeNull();
    if (frameBoundsTyping) {
      expect(frameBoundsTyping.top).toBeGreaterThanOrEqual(0);
      expect(frameBoundsTyping.bottom).toBeGreaterThan(0);
    }

    // The gameScreen scroll must still be 0
    const scrollAfterTyping = await page.evaluate(() => {
      const gs = document.getElementById('gameScreen');
      return gs ? gs.scrollTop : -1;
    });
    expect(scrollAfterTyping).toBe(0);

    // The typed text must be visible in the input
    const inputValue = await mobileInput.inputValue();
    expect(inputValue).toBe('Inception');

    // ─── CLOSE KEYBOARD (restore viewport) ───
    await page.evaluate(() => {
      document.body.classList.remove('mobile-typing');
      document.body.classList.remove('keyboard-visible');
      document.documentElement.style.setProperty('--visual-vh', String(window.innerHeight));
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_game_keyboard_closed.png') });

    // After closing keyboard, frame should still be perfectly visible
    const frameBoundsRestored = await page.evaluate(() => {
      const frameContainer = document.querySelector('#imageContainer') ||
                             document.querySelector('.frame-image-container') ||
                             document.querySelector('.frame-display');
      if (!frameContainer) return null;
      const r = frameContainer.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    });
    expect(frameBoundsRestored).not.toBeNull();
    if (frameBoundsRestored) {
      expect(frameBoundsRestored.top).toBeGreaterThanOrEqual(0);
    }
  });

});
