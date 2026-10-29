import { test, expect } from '@playwright/test';

test.describe('Winner Screen 4-Corner Pop-ups (Dual QR + 2 Bigger Memes) & No Home Memes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Home screen has NO memes or meme pills (memes moved strictly to Winner Screen)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const homeLeftMeme = page.locator('#homeMemeLeftPopup');
    const homeRightMeme = page.locator('#homeMemeRightPopup');
    const homeLeftPill = page.locator('#homeMemeLeftPill');
    const homeRightPill = page.locator('#homeMemeRightPill');

    expect(await homeLeftMeme.count()).toBe(0);
    expect(await homeRightMeme.count()).toBe(0);
    expect(await homeLeftPill.count()).toBe(0);
    expect(await homeRightPill.count()).toBe(0);
  });

  test('Winner screen message matches exact requested text', async ({ page }) => {
    const msg = await page.locator('.cw-info-text').textContent();
    expect(msg).toContain('Bhai, woh QR code UPI ka nahi hai');
    expect(msg).toContain('Jisko bhi apne business ke liye website, app ya kuch bhi banwana ho');
    expect(msg).toContain('20% hum Scoopcast ko Super Chat kar denge');
    expect(msg).toContain('Toh iske liye Scoop Luck bhi de dijiye');
  });

  test('All 3 sections have updated counts and Round 40 Supa Supa logic', async ({ page }) => {
    const sections = await page.evaluate(() => GS.sections);
    expect(sections.length).toBe(3);
    expect(sections[0].frames.length).toBe(20);
    expect(sections[1].frames.length).toBe(10);
    expect(sections[2].frames.length).toBe(10);

    // Verify Round 40 Supa Supa
    const r40 = sections[2].frames[9];
    expect(r40.answer).toBe('AMAN SINHA');
    expect(r40.displayAnswer).toBe('SUPA SUPA');
    expect(r40.content).toContain('Supa Supa copy.webp');
    expect(r40.revealContent).toContain('Supa Supa.webp');

    // Test Round 40 gameplay reveal in engine
    const testR40 = await page.evaluate(() => {
      const s3 = GS.sections.find(s => s.id === 3);
      const frame = s3.frames[9];

      GS.players = [{ id: 'p1', name: 'Tester', score: 0, avatar: 'aman' }];
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Tester';
      MultiplayerEngine.currentPlaylist = [{ ...frame, sectionName: 'Guess the Eye', sectionId: 3 }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];
      MultiplayerEngine._roundGuessedCorrectIds = new Set();

      // Submit correct guess "AMAN SINHA"
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Tester', playerAvatar: 'aman', guess: 'AMAN SINHA', roundIndex: 0 });
      const scoreAfter = GS.players[0].score;

      // End round and verify displayAnswer
      MultiplayerEngine.endRound();
      const ansTitle = document.getElementById('ansTitle');

      return {
        scoreAfter,
        revealedTitle: ansTitle ? ansTitle.textContent : ''
      };
    });

    expect(testR40.scoreAfter).toBe(10);
    expect(testR40.revealedTitle).toBe('SUPA SUPA');
  });

  test('Winner screen displays all 4 pop-ups in 4 corners on large desktop without overlap', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Trigger WinnerScreen directly
    await page.evaluate(() => {
      UI.showScreen('winnerScreen');
      WinnerScreen.openQrPopup('all');
      WinnerScreen.openMeme('all');
    });

    await page.waitForTimeout(600); // allow spring animations

    const qrLeft = page.locator('#cwQrPopup');
    const qrRight = page.locator('#cwQrPopupRight');
    const memeLeft = page.locator('#cwMemeLeftPopup');
    const memeRight = page.locator('#cwMemeRightPopup');
    const stage = page.locator('.cw-center-stage-grid');

    await expect(qrLeft).toBeVisible();
    await expect(qrRight).toBeVisible();
    await expect(memeLeft).toBeVisible();
    await expect(memeRight).toBeVisible();

    const boxQrLeft = await qrLeft.boundingBox();
    const boxQrRight = await qrRight.boundingBox();
    const boxMemeLeft = await memeLeft.boundingBox();
    const boxMemeRight = await memeRight.boundingBox();
    const boxStage = await stage.boundingBox();

    expect(boxQrLeft).not.toBeNull();
    expect(boxQrRight).not.toBeNull();
    expect(boxMemeLeft).not.toBeNull();
    expect(boxMemeRight).not.toBeNull();
    expect(boxStage).not.toBeNull();

    // 1. Verify bigger meme dimensions (width >= 320px)
    expect(boxMemeLeft.width).toBeGreaterThanOrEqual(320);
    expect(boxMemeRight.width).toBeGreaterThanOrEqual(320);

    // 2. Vertical separation on Left Flank: Top QR is completely above Bottom Meme
    expect(boxQrLeft.y + boxQrLeft.height).toBeLessThan(boxMemeLeft.y);

    // 3. Vertical separation on Right Flank: Top QR is completely above Bottom Meme
    expect(boxQrRight.y + boxQrRight.height).toBeLessThan(boxMemeRight.y);

    // 4. Horizontal separation: Left flank popups are to the left of the center stage
    expect(boxQrLeft.x + boxQrLeft.width).toBeLessThan(boxStage.x);
    expect(boxMemeLeft.x + boxMemeLeft.width).toBeLessThan(boxStage.x);

    // 5. Horizontal separation: Right flank popups are to the right of the center stage
    expect(boxQrRight.x).toBeGreaterThan(boxStage.x + boxStage.width);
    expect(boxMemeRight.x).toBeGreaterThan(boxStage.x + boxStage.width);

    // Verify meme images
    const imgLeft = await memeLeft.locator('.cw-meme-img').getAttribute('src');
    const imgRight = await memeRight.locator('.cw-meme-img').getAttribute('src');
    expect(imgLeft).toBe('bg/home_meme_left.webp');
    expect(imgRight).toBe('bg/home_meme_right.webp');
  });

  test('Dismissing winner meme opens its pill and clicking pill restores popup', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      UI.showScreen('winnerScreen');
      WinnerScreen.openMeme('left');
    });

    const memeLeft = page.locator('#cwMemeLeftPopup');
    const memePill = page.locator('#cwMemeLeftPill');

    await expect(memeLeft).toBeVisible();
    await expect(memePill).toBeHidden();

    // Close meme
    await memeLeft.locator('.cw-meme-close-btn').click();
    await expect(memeLeft).toBeHidden();
    await expect(memePill).toBeVisible();

    // Click pill to reopen
    await memePill.click();
    await expect(memeLeft).toBeVisible();
    await expect(memePill).toBeHidden();
  });

  test('On compact viewports (< 1500px), bottom memes tuck into pills to guarantee zero overlap', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      UI.showScreen('winnerScreen');
      WinnerScreen.openMeme('all');
    });

    const memeLeft = page.locator('#cwMemeLeftPopup');
    const memePill = page.locator('#cwMemeLeftPill');

    // Bottom meme is tucked into pill
    await expect(memeLeft).toBeHidden();
    await expect(memePill).toBeVisible();

    // Clicking pill opens centered modal mode without overlapping
    await memePill.click();
    await expect(memeLeft).toBeVisible();
    await expect(memeLeft).toHaveClass(/modal-mode/);

    // Close modal
    await memeLeft.locator('.cw-meme-close-btn').click();
    await expect(memeLeft).toBeHidden();
  });
});
