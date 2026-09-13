const { test, expect } = require('@playwright/test');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/admin/.gemini/antigravity/brain/bc0cd56f-3310-43bd-90d8-de2b4d09a9e8';

test('Capture full lobby page on desktop screen (1280x720)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.locator('.h-card-create').click();
  await page.locator('#hostPlayerNameInput').fill('HostPlayer');
  await page.locator('#createRoomModal .mp-btn-primary').click();

  await expect(page.locator('#playerLobbyScreen')).toBeVisible();

  await page.evaluate(() => {
    GS.players = [
      { id: 'p1', name: 'Aman', avatar: 'aman', score: 0, isHost: true, color: '#FF6B9D', loaded: true },
      { id: 'p2', name: 'Amish', avatar: 'amish', score: 0, isHost: false, color: '#57c3e0', loaded: true },
      { id: 'p3', name: 'Aziz', avatar: 'aziz', score: 0, isHost: false, color: '#f0a828', loaded: true },
      { id: 'p4', name: 'Vish', avatar: 'vish', score: 0, isHost: false, color: '#84cc16', loaded: true }
    ];
    MultiplayerEngine.renderLobbyUI();
  });

  await page.waitForTimeout(600);

  const screenPath = path.join(ARTIFACT_DIR, 'lobby_desktop_screen.png');
  await page.screenshot({
    path: screenPath,
    fullPage: false
  });

  console.log('DESKTOP_SCREENSHOT_CAPTURED:', screenPath);
});
