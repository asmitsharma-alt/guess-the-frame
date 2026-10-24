const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:/Users/admin/.gemini/antigravity/brain/2d86aae9-c430-40ad-b643-4d6a580f5293/page_inspections';
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

test('Verify Native Avatars on Game Screen', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Verify renderAvatar output natively from the code
  const directOutputs = await page.evaluate(() => {
    return [
      { name: 'Ayank', avatar: 'ayank' },
      { name: 'Ayush', avatar: 'ayush' },
      { name: 'Joel', avatar: 'joel' },
      { name: 'Praggya', avatar: 'praggya' },
      { name: 'Ruhaan', avatar: 'ruhaan' }
    ].map(p => ({
      player: p,
      rendered: renderAvatar(p, 'lb')
    }));
  });

  console.log('NATIVE RENDER AVATAR OUTPUTS:', JSON.stringify(directOutputs, null, 2));

  for (const item of directOutputs) {
    expect(item.rendered).toContain('img src="avvtar/');
    expect(item.rendered).toContain('.webp"');
  }

  // Navigate through flow to game screen
  await page.locator('.h-card-create').click();
  await page.locator('#hostPlayerNameInput').fill('Ayank');
  await page.locator('#createRoomModal .mp-avatar-option[data-avatar="ayank"]').click();
  await page.locator('#createRoomModal .mp-btn-primary').click();

  // Add 4 players
  await page.evaluate(() => {
    GS.players = [
      { id: 'p1', name: 'Ayank', avatar: 'ayank', score: 20, isHost: true, color: '#ff6b9d', loaded: true },
      { id: 'p2', name: 'Ayush', avatar: 'ayush', score: 15, isHost: false, color: '#3b82f6', loaded: true },
      { id: 'p3', name: 'Joel', avatar: 'joel', score: 10, isHost: false, color: '#84cc16', loaded: true },
      { id: 'p4', name: 'Praggya', avatar: 'praggya', score: 5, isHost: false, color: '#facc15', loaded: true }
    ];
  });

  await page.locator('#lobbyStartBtn').click();
  await page.waitForTimeout(500);

  // Dismiss round intro
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    const ov = document.getElementById('roundIntroOv');
    if (ov) ov.classList.remove('on');
    UI.renderLB();
  });

  // Check Leaderboard DOM
  const lbImgCount = await page.locator('#leaderboard .lb-av-wrap img').count();
  expect(lbImgCount).toBe(4);

  // Take screenshot of leaderboard
  const lbElement = page.locator('#leaderboard');
  await lbElement.screenshot({ path: path.join(OUT_DIR, 'native_leaderboard_verified.png') });
});
