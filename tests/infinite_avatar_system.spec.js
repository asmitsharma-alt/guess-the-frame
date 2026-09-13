import { test, expect } from '@playwright/test';

test.describe('Infinite Avatar System — Founders Row, Permanent Memory, Winner Podium & Offline Fallback', () => {

  test('Founders Row displays 4 original avatars with backward-compatible locators', async ({ page }) => {
    await page.goto('/');
    await page.locator('.h-card-create').click();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);

    // Verify all 4 founders exist with .mp-avatar-option and data-avatar attributes
    const amanOption = page.locator('#createRoomModal .mp-avatar-option[data-avatar="aman"]');
    const amishOption = page.locator('#createRoomModal .mp-avatar-option[data-avatar="amish"]');
    const azizOption = page.locator('#createRoomModal .mp-avatar-option[data-avatar="aziz"]');
    const vishOption = page.locator('#createRoomModal .mp-avatar-option[data-avatar="vish"]');

    await expect(amanOption).toBeVisible();
    await expect(amishOption).toBeVisible();
    await expect(azizOption).toBeVisible();
    await expect(vishOption).toBeVisible();

    // Selecting Amish selects it and updates preview
    await amishOption.click();
    await expect(amishOption).toHaveClass(/selected/);

    const saved = await page.evaluate(() => localStorage.getItem('gtf_player_avatar'));
    expect(saved).toBe('amish');
  });

  test('Infinite Grid loads bold circular avatars and selecting one persists to localStorage', async ({ page }) => {
    await page.goto('/');
    await page.locator('.h-card-create').click();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);

    // Verify infinite circular avatar buttons are rendered
    const circularBtns = page.locator('#createRoomModal .mp-circular-avatar-btn');
    const count = await circularBtns.count();
    expect(count).toBeGreaterThanOrEqual(10);

    // Select the first circular avatar
    const firstCustomBtn = circularBtns.first();
    const avatarUrl = await firstCustomBtn.getAttribute('data-avatar');
    expect(avatarUrl).toContain('api.dicebear.com/9.x/lorelei/svg');

    await firstCustomBtn.click();
    await expect(firstCustomBtn).toHaveClass(/selected/);

    // Live preview updates with selected custom avatar
    const previewSrc = await page.locator('#createRoomModal .mp-preview-circle-img').getAttribute('src');
    expect(previewSrc).toBe(avatarUrl);

    // Check Permanent Memory in localStorage
    const savedInStorage = await page.evaluate(() => localStorage.getItem('gtf_player_avatar'));
    expect(savedInStorage).toBe(avatarUrl);
  });

  test('Permanent Memory: reloading the page or opening Join Modal restores selected avatar', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gtf_player_avatar', 'https://api.dicebear.com/9.x/lorelei/svg?seed=Nolan&backgroundColor=38bdf8');
      localStorage.setItem('gtf_player_name', 'NeoNolan');
    });

    await page.reload();
    await page.locator('.h-card-join').click();
    await expect(page.locator('#joinRoomModal')).toHaveClass(/active/);

    // Preview in Join Modal should display Nolan
    const previewSrc = await page.locator('#joinRoomModal .mp-preview-circle-img').getAttribute('src');
    expect(previewSrc).toContain('seed=Nolan');
  });

  test('Ultra-Crisp Winner Podium displays avatar SVG and handles offline fallback', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      if (typeof UI !== 'undefined') {
        UI.showScreen('winnerScreen');
      }
      if (typeof WinnerScreen !== 'undefined' && WinnerScreen.show) {
        WinnerScreen.show([
          { id: 'p1', name: 'Champion Nolan', score: 100, avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Nolan&backgroundColor=facc15' },
          { id: 'p2', name: 'Silver Amish', score: 70, avatar: 'amish' },
          { id: 'p3', name: 'Bronze Aziz', score: 50, avatar: 'aziz' }
        ]);
      }
    });

    await expect(page.locator('#winnerScreen')).toHaveClass(/active/);

    // Champion card verification
    const champImg = page.locator('#champAvatarImg');
    await expect(champImg).toBeVisible();
    const champSrc = await champImg.getAttribute('src');
    expect(champSrc).toContain('seed=Nolan');

    // Silver card verification
    const silverImg = page.locator('#silverAvatarImg');
    await expect(silverImg).toBeVisible();
    const silverSrc = await silverImg.getAttribute('src');
    expect(silverSrc).toContain('amish');

    // Test offline fallback on champion image
    await champImg.evaluate((img) => {
      img.dispatchEvent(new Event('error'));
    });
    const fallbackSrc = await champImg.getAttribute('src');
    expect(fallbackSrc).toContain('/avvtar/aman.svg');
  });

  test('Multiplayer Real-time: Host creates room with custom avatar and joins lobby', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/');
    await page.locator('.h-card-create').click();
    await page.locator('#hostPlayerNameInput').fill('AvatarMaster');

    // Click an infinite avatar
    const circularAvatar = page.locator('#createRoomModal .mp-circular-avatar-btn').nth(2);
    const chosenUrl = await circularAvatar.getAttribute('data-avatar');
    await circularAvatar.click();

    await page.locator('#createRoomModal .mp-btn-primary').click();
    await expect(page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 15000 });

    // Verify avatar in lobby
    const lobbyAvatarImg = page.locator('#lobbyPlayerList img').first();
    await expect(lobbyAvatarImg).toBeVisible();
    const currentSrc = await lobbyAvatarImg.getAttribute('src');
    expect(currentSrc).toBe(chosenUrl);

    await context.close();
  });

});
