import { test, expect } from '@playwright/test';

test.describe('Winner Screen & Home Screen Meme Removal & Winner Message Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Home screen has NO memes or meme pills', async ({ page }) => {
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

  test('Winner screen has NO memes or meme pills', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => {
      UI.showScreen('winnerScreen');
      if (typeof WinnerScreen !== 'undefined') {
        if (WinnerScreen.openMeme) WinnerScreen.openMeme('all');
      }
    });

    const memeLeft = page.locator('#cwMemeLeftPopup');
    const memeRight = page.locator('#cwMemeRightPopup');
    const memePillLeft = page.locator('#cwMemeLeftPill');
    const memePillRight = page.locator('#cwMemeRightPill');

    expect(await memeLeft.count()).toBe(0);
    expect(await memeRight.count()).toBe(0);
    expect(await memePillLeft.count()).toBe(0);
    expect(await memePillRight.count()).toBe(0);
  });

  test('Winner screen message matches exact requested text', async ({ page }) => {
    const msg = await page.locator('.cw-info-text').textContent();
    expect(msg).toContain('Umeed hai ki aap logon ko game khelne mein maza aaya hoga! Milte hain agle hafte');
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

      GS.players = [{ id: 'p1', name: 'Tester', score: 0, avatar: 'ayank' }];
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
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Tester', playerAvatar: 'ayank', guess: 'AMAN SINHA', roundIndex: 0 });
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

  test('Winner screen displays right QR pop-up cleanly on large desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Trigger WinnerScreen directly
    await page.evaluate(() => {
      UI.showScreen('winnerScreen');
      WinnerScreen.openQrPopup('all');
    });

    await page.waitForTimeout(400);

    const qrLeft = page.locator('#cwQrPopup');
    const qrRight = page.locator('#cwQrPopupRight');
    const stage = page.locator('.cw-center-stage-grid');

    // Left QR removed per user request
    expect(await qrLeft.count()).toBe(0);
    await expect(qrRight).toBeVisible();

    const boxQrRight = await qrRight.boundingBox();
    const boxStage = await stage.boundingBox();

    expect(boxQrRight).not.toBeNull();
    expect(boxStage).not.toBeNull();

    // Horizontal separation: Right QR is to the right of the center stage
    expect(boxQrRight.x).toBeGreaterThan(boxStage.x + boxStage.width);
  });
});
