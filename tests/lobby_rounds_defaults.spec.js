const { test, expect } = require('@playwright/test');

test.describe('Lobby Default Rounds Configuration', () => {
  test('Lobby defaults to 20 Frame rounds, 10 Eye rounds, 10 Dialogue rounds (Total 40)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Create room to enter the lobby
    await page.evaluate(() => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
    });

    // Check hostSettings object defaults
    const settings = await page.evaluate(() => MultiplayerEngine.hostSettings);
    expect(settings.roundsByMode.frames).toBe(20);
    expect(settings.roundsByMode.eyes).toBe(10);
    expect(settings.roundsByMode.dialogue).toBe(10);
    expect(settings.rounds).toBe(40);

    // Verify UI display in lobby
    const totalBadge = page.locator('#gameSettingsTotalBadge');
    await expect(totalBadge).toHaveText('40 Rounds');

    const framesText = page.locator('#hostFramesRoundsBtn');
    await expect(framesText).toHaveText('20');

    const eyesText = page.locator('#hostEyesRoundsBtn');
    await expect(eyesText).toHaveText('10');

    const dialogueText = page.locator('#hostDialogueRoundsBtn');
    await expect(dialogueText).toHaveText('10');

    // Test adjustments
    // Decrease Frames by 1 -> 19
    await page.locator('button[title="Decrease Frame Rounds"]').click();
    await expect(framesText).toHaveText('19');
    await expect(totalBadge).toHaveText('39 Rounds');

    // Increase Frames by 1 -> back to 20 (max)
    await page.locator('button[title="Increase Frame Rounds"]').click();
    await expect(framesText).toHaveText('20');
    await expect(totalBadge).toHaveText('40 Rounds');

    // Increasing beyond max (20) remains capped at 20
    await page.locator('button[title="Increase Frame Rounds"]').click();
    await expect(framesText).toHaveText('20');
    await expect(totalBadge).toHaveText('40 Rounds');

    // Increasing eyes beyond max (10) remains capped at 10
    await page.locator('button[title="Increase Eyes Rounds"]').click();
    await expect(eyesText).toHaveText('10');
    await expect(totalBadge).toHaveText('40 Rounds');

    // Increasing dialogue beyond max (10) remains capped at 10
    await page.locator('button[title="Increase Dialogue Rounds"]').click();
    await expect(dialogueText).toHaveText('10');
    await expect(totalBadge).toHaveText('40 Rounds');
  });
});
