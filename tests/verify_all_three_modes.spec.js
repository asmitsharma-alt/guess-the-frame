const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Visual Verification: All 3 Modes', () => {
  const artifactDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\bc0cd56f-3310-43bd-90d8-de2b4d09a9e8';

  test('Capture Desktop Lobby with 3 modes active', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('.h-card-create').click();
    await page.locator('#createRoomModal .mp-btn-primary').click();
    await expect(page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 10000 });

    // Verify all 3 mode badges exist and are visible
    await expect(page.locator('#modeBadge-frames')).toBeVisible();
    await expect(page.locator('#modeBadge-eyes')).toBeVisible();
    await expect(page.locator('#modeBadge-dialogue')).toBeVisible();

    await page.waitForTimeout(1000);
    const shotPath = path.join(artifactDir, 'desktop_lobby_modes.png');
    await page.screenshot({ path: shotPath });
    console.log('Saved desktop lobby shot:', shotPath);
  });

  test('Capture Mobile Lobby with 3 modes active', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('.h-card-create').click();
    await page.locator('#createRoomModal .mp-btn-primary').click();
    await expect(page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 10000 });

    // Verify all 3 mode badges exist on mobile
    await expect(page.locator('#modeBadge-frames')).toBeVisible();
    await expect(page.locator('#modeBadge-eyes')).toBeVisible();
    await expect(page.locator('#modeBadge-dialogue')).toBeVisible();

    await page.waitForTimeout(1000);
    const shotPath = path.join(artifactDir, 'mobile_lobby_modes.png');
    await page.screenshot({ path: shotPath });
    console.log('Saved mobile lobby shot:', shotPath);
  });

  test('Capture Gameplay: Guess The Dialogue Round', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.currentPlaylist = [
        {
          sectionId: 3,
          sectionName: 'Guess the Dialogue',
          category: 'dialogue',
          type: 'dialogue',
          content: "Aaya hoon, kuch toh loot kar jaunga... Khandani chor hoon main, khandani!",
          answer: "ANDAAZ APNA APNA",
          year: "1994"
        }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      UI.showScreen('gameScreen');
      FrameDisplay.showFrame(MultiplayerEngine.currentPlaylist[0]);
    });

    await expect(page.locator('#frameDialogue')).toBeVisible();
    await expect(page.locator('#dialogueQuote')).toContainText('Aaya hoon');

    await page.waitForTimeout(1000);
    const shotPath = path.join(artifactDir, 'gameplay_dialogue_round.png');
    await page.screenshot({ path: shotPath });
    console.log('Saved dialogue round shot:', shotPath);
  });

  test('Capture Gameplay: Guess The Eyes Closeup and Reveal', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.currentPlaylist = [
        {
          sectionId: 2,
          sectionName: 'Guess the Eyes',
          category: 'eyes',
          type: 'image',
          content: "GUESSTHEEYES/Emma Stone copy.webp",
          revealContent: "GUESSTHEEYES/Emma Stone.webp",
          answer: "EMMA STONE",
          year: "Actor"
        }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      UI.showScreen('gameScreen');
      FrameDisplay.showFrame(MultiplayerEngine.currentPlaylist[0]);
    });

    await expect(page.locator('#imageContainer')).toBeVisible();
    await page.waitForTimeout(1000);
    const cropShotPath = path.join(artifactDir, 'gameplay_eyes_crop.png');
    await page.screenshot({ path: cropShotPath });
    console.log('Saved eyes crop shot:', cropShotPath);

    // Skip to answer reveal
    await page.evaluate(() => {
      MultiplayerEngine.hostSkipRound();
    });
    await expect(page.locator('#answerOverlay')).toBeVisible();
    await page.waitForTimeout(1000);
    const revealShotPath = path.join(artifactDir, 'gameplay_eyes_reveal.png');
    await page.screenshot({ path: revealShotPath });
    console.log('Saved eyes reveal shot:', revealShotPath);
  });
});
