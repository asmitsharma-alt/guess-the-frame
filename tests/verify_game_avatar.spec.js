const { test, expect } = require('@playwright/test');

test('Verify Native SVG Avatars on Game Screen', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Verify renderAvatar output natively from the code
  const directOutputs = await page.evaluate(() => {
    return [
      { name: 'Aman', avatar: 'aman' },
      { name: 'Vish', avatar: 'vish' },
      { name: 'Aziz', avatar: 'aziz' },
      { name: 'Amish', avatar: 'amish' }
    ].map(p => ({
      player: p,
      rendered: renderAvatar(p, 'lb')
    }));
  });

  for (const item of directOutputs) {
    expect(item.rendered).toContain('img src="avvtar/');
    expect(item.rendered).toContain('.svg"');
  }

  // Navigate through flow to game screen
  await page.locator('.h-card-create').click();
  await page.locator('#hostPlayerNameInput').fill('Aman');
  await page.locator('#createRoomModal .mp-avatar-option[data-avatar="aman"]').click();
  await page.locator('#createRoomModal .mp-btn-primary').click();

  // Add 4 players
  await page.evaluate(() => {
    GS.players = [
      { id: 'p1', name: 'Aman', avatar: 'aman', score: 20, isHost: true, color: '#57c3e0', loaded: true },
      { id: 'p2', name: 'Vish', avatar: 'vish', score: 15, isHost: false, color: '#ff7eb6', loaded: true },
      { id: 'p3', name: 'Aziz', avatar: 'aziz', score: 10, isHost: false, color: '#f0a828', loaded: true },
      { id: 'p4', name: 'Amish', avatar: 'amish', score: 5, isHost: false, color: '#3fbf8f', loaded: true }
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

  // Open scoring grid
  await page.evaluate(() => {
    UI.showScoringOv(true);
  });
  await page.waitForTimeout(300);

  const spImgCount = await page.locator('#scoringGrid .spbtn img').count();
  expect(spImgCount).toBe(4);
});
