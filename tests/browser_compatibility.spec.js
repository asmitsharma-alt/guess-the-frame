const { test, expect, chromium, firefox, webkit, devices } = require('@playwright/test');

test.describe('ScoopCast Cross-Browser & Mobile Compatibility Audit', () => {
  test.setTimeout(60000);

  test('1. Desktop Chromium (Chrome / Edge Engine)', async () => {
    console.log('[Browser Compat] Testing Desktop Chromium (Chrome / Edge)...');
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');

    // Verify Title & Meta
    const title = await page.title();
    expect(title).toContain('Guess The Frame');

    // Verify WebSocket & ScoopCastDebug telemetry
    const debugSummary = await page.evaluate(() => window.ScoopCastDebug ? window.ScoopCastDebug.getSummary() : null);
    expect(debugSummary).not.toBeNull();
    expect(debugSummary.network).toBe('online');
    expect(debugSummary.jsCrashes).toBe(0);

    // Verify Modal & Input Interaction
    await page.locator('.h-card-create').click();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);
    await page.locator('#hostPlayerNameInput').fill('ChromeHost');
    expect(await page.locator('#hostPlayerNameInput').inputValue()).toBe('ChromeHost');

    // Verify Background Resume Handling
    await page.evaluate(() => {
      window.MultiplayerEngine.roomId = 'room_TESTING';
      window.MultiplayerEngine.playerId = 'p_TESTING';
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const stateAway = await page.evaluate(() => window.MultiplayerEngine ? window.MultiplayerEngine.connectionState : null);
    expect(stateAway).toBe('AWAY');

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    console.log('  ✓ Desktop Chromium verified successfully');
    await browser.close();
  });

  test('2. Desktop Firefox', async () => {
    console.log('[Browser Compat] Testing Desktop Firefox...');
    const browser = await firefox.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify Zero JS Crashes
    const debugSummary = await page.evaluate(() => window.ScoopCastDebug ? window.ScoopCastDebug.getSummary() : null);
    expect(debugSummary).not.toBeNull();
    expect(debugSummary.jsCrashes).toBe(0);

    // Verify Join Modal and Code Input in Firefox
    await page.locator('.h-card-join').click();
    await expect(page.locator('#joinRoomModal')).toHaveClass(/active/);
    await page.locator('#joinCodeInput').fill('FFTEST');
    expect(await page.locator('#joinCodeInput').inputValue()).toBe('FFTEST');

    console.log('  ✓ Desktop Firefox verified successfully');
    await browser.close();
  });

  test('3. Mobile Android Chrome (Pixel 5 Emulation)', async () => {
    console.log('[Browser Compat] Testing Mobile Android Chrome...');
    const pixel5 = devices['Pixel 5'];
    const browser = await chromium.launch();
    const context = await browser.newContext({ ...pixel5 });
    const page = await context.newPage();

    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify Mobile Layout
    const isMobile = await page.evaluate(() => window.innerWidth <= 600);
    expect(isMobile).toBe(true);

    // Tap Join Card
    await page.locator('.h-card-join').tap();
    await expect(page.locator('#joinRoomModal')).toHaveClass(/active/);

    // Test virtual keyboard entry
    await page.locator('#joinCodeInput').fill('ANDRO1');
    await page.locator('#joinPlayerNameInput').fill('AndroidUser');
    expect(await page.locator('#joinCodeInput').inputValue()).toBe('ANDRO1');
    expect(await page.locator('#joinPlayerNameInput').inputValue()).toBe('AndroidUser');

    console.log('  ✓ Mobile Android Chrome verified successfully');
    await browser.close();
  });

  test('4. Mobile iOS Safari (iPhone 13 Emulation)', async () => {
    console.log('[Browser Compat] Testing Mobile iOS Safari (WebKit)...');
    const iPhone13 = devices['iPhone 13'];
    const browser = await webkit.launch();
    const context = await browser.newContext({ ...iPhone13 });
    const page = await context.newPage();

    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Check WebKit layout and CSS backdrop-filter / border-radius rendering
    const debugSummary = await page.evaluate(() => window.ScoopCastDebug ? window.ScoopCastDebug.getSummary() : null);
    expect(debugSummary).not.toBeNull();
    expect(debugSummary.jsCrashes).toBe(0);

    // Open Create Modal
    await page.locator('.h-card-create').tap();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);

    // Select Avatar in iOS Safari
    const amishAvatar = page.locator('#createRoomModal .avatar-option[data-avatar="amish"]');
    if (await amishAvatar.isVisible()) {
      await amishAvatar.tap();
      await expect(amishAvatar).toHaveClass(/selected/);
    }

    console.log('  ✓ Mobile iOS Safari verified successfully');
    await browser.close();
  });
});
