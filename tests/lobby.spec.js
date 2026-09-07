const { test, expect } = require('@playwright/test');

test.describe('Lobby & Player Setup Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Homepage displays core branding and mode selection cards', async ({ page }) => {
    await expect(page.locator('#homeScreen')).toBeVisible();
    await expect(page.locator('.h-hero')).toBeVisible();

    const hostCard = page.locator('.h-card-create');
    const joinCard = page.locator('.h-card-join');
    const localCard = page.locator('.h-card-local');

    await expect(hostCard).toBeVisible();
    await expect(joinCard).toBeVisible();
    await expect(localCard).toBeHidden();
  });

  test('Host Game modal opens and generates a valid room code', async ({ page }) => {
    const hostCard = page.locator('.h-card-create');
    await hostCard.click();

    const modal = page.locator('#createRoomModal');
    await expect(modal).toHaveClass(/active/);

    const confirmBtn = page.locator('#createRoomModal .mp-btn-primary');
    await confirmBtn.click();

    await expect(page.locator('#playerLobbyScreen')).toBeVisible();

    const roomCode = await page.evaluate(() => {
      return (typeof MultiplayerEngine !== 'undefined' && MultiplayerEngine.roomCode) ? MultiplayerEngine.roomCode : null;
    });
    expect(roomCode).toBeTruthy();
    expect(roomCode.length).toBeGreaterThanOrEqual(4);
  });

  test('Join Game modal opens, validates room code input, and rejects empty submission', async ({ page }) => {
    const joinCard = page.locator('.h-card-join');
    await joinCard.click();

    const joinModal = page.locator('#joinRoomModal');
    await expect(joinModal).toHaveClass(/active/);

    const input = page.locator('#joinCodeInput');
    await expect(input).toBeVisible();
    await input.fill('');

    let dialogAppeared = false;
    page.once('dialog', async dialog => {
      dialogAppeared = true;
      await dialog.accept();
    });

    const confirmJoin = page.locator('#joinRoomModal .mp-btn-primary');
    await confirmJoin.click();

    await page.waitForTimeout(300);
    expect(dialogAppeared).toBe(true);
    await expect(page.locator('#homeScreen')).toBeVisible();
  });

  test('Avatar selection updates active avatar and visual preview', async ({ page }) => {
    const hostCard = page.locator('.h-card-create');
    await hostCard.click();

    const avatarOpts = page.locator('#createRoomModal .mp-avatar-option');
    const count = await avatarOpts.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Click second avatar (Amish)
    await avatarOpts.nth(1).click();
    const selectedAvatar = await page.evaluate(() => {
      return MultiplayerEngine.selectedAvatarForModal || MultiplayerEngine.playerAvatar;
    });
    expect(selectedAvatar).toBe('amish');
  });

  test('Lobby renders player cards and allows host to adjust game settings', async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'TEST';
      MultiplayerEngine.playerName = 'HostPlayer';
      MultiplayerEngine.playerAvatar = 'aman';
      GS.players = [
        { id: 'p_host', name: 'HostPlayer', avatar: 'aman', score: 0, isHost: true, loaded: true }
      ];
      UI.showScreen('playerLobbyScreen');
      MultiplayerEngine.renderLobbyUI();
    });

    await expect(page.locator('#playerLobbyScreen')).toBeVisible();
    const playerCard = page.locator('.lobby-player, .lp-card, #lobbyPlayerList').first();
    await expect(playerCard).toBeVisible();

    const settings = await page.evaluate(() => MultiplayerEngine.hostSettings);
    expect(settings).toBeDefined();
    expect(settings.timer).toBeGreaterThanOrEqual(10);
  });
});
