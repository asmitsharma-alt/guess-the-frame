import { test, expect } from '@playwright/test';

test.describe('Home Screen Memes, Zero-Overlap & Winner Screen Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
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

  test('Home screen displays both left and right memes on desktop without overlapping cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const leftPopup = page.locator('#homeMemeLeftPopup');
    const rightPopup = page.locator('#homeMemeRightPopup');
    const centerCards = page.locator('.h-cards-multiplayer');

    await expect(leftPopup).toBeVisible();
    await expect(rightPopup).toBeVisible();

    const leftBox = await leftPopup.boundingBox();
    const rightBox = await rightPopup.boundingBox();
    const centerBox = await centerCards.boundingBox();

    expect(leftBox).not.toBeNull();
    expect(rightBox).not.toBeNull();
    expect(centerBox).not.toBeNull();

    // Verify left popup is completely to the left of center cards
    expect(leftBox.x + leftBox.width).toBeLessThan(centerBox.x);

    // Verify right popup is completely to the right of center cards
    expect(rightBox.x).toBeGreaterThan(centerBox.x + centerBox.width);

    // Verify image sources
    const leftImgSrc = await leftPopup.locator('.home-meme-img').getAttribute('src');
    const rightImgSrc = await rightPopup.locator('.home-meme-img').getAttribute('src');
    expect(leftImgSrc).toBe('bg/home_meme_left.webp');
    expect(rightImgSrc).toBe('bg/home_meme_right.webp');
  });

  test('Opening Create Room modal hides home meme popups (Zero-Overlap Guarantee)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const leftPopup = page.locator('#homeMemeLeftPopup');
    const rightPopup = page.locator('#homeMemeRightPopup');

    await expect(leftPopup).toBeVisible();
    await expect(rightPopup).toBeVisible();

    // Open modal
    await page.locator('.h-card-create').click();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);

    // Verify meme popups are hidden
    await expect(leftPopup).toBeHidden();
    await expect(rightPopup).toBeHidden();

    // Close modal
    await page.locator('#createRoomModal .mp-modal-close').click();
    await expect(page.locator('#createRoomModal')).not.toHaveClass(/active/);

    // Popups reappear
    await expect(leftPopup).toBeVisible();
    await expect(rightPopup).toBeVisible();
  });

  test('Dismissing home meme opens pill and clicking pill restores popup', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const leftPopup = page.locator('#homeMemeLeftPopup');
    const leftPill = page.locator('#homeMemeLeftPill');

    await expect(leftPopup).toBeVisible();
    await expect(leftPill).toBeHidden();

    // Click close on left popup
    await leftPopup.locator('.home-meme-close-btn').click();
    await expect(leftPopup).toBeHidden();
    await expect(leftPill).toBeVisible();

    // Click pill to reopen
    await leftPill.click();
    await expect(leftPopup).toBeVisible();
    await expect(leftPill).toBeHidden();
  });

  test('Responsive behavior: on compact viewports (1024px), pills are shown and popups open in modal-mode', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const leftPopup = page.locator('#homeMemeLeftPopup');
    const leftPill = page.locator('#homeMemeLeftPill');

    // On narrow screens (1024px < 1260px), fixed side popups are tucked away
    await expect(leftPopup).toBeHidden();
    await expect(leftPill).toBeVisible();

    // Click pill opens modal mode
    await leftPill.click();
    await expect(leftPopup).toBeVisible();
    await expect(leftPopup).toHaveClass(/modal-mode/);

    // Close modal
    await leftPopup.locator('.home-meme-close-btn').click();
    await expect(leftPopup).toBeHidden();
  });
});
