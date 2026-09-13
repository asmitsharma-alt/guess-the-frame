const { test, expect } = require('@playwright/test');

test.describe('Mid-Game Leave and Rejoin Bug Reproduction', () => {
  test.setTimeout(120000);

  test('Player leaves mid-game and rejoins: should resume gameScreen without reset or lobby kick', async ({ browser }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/');
    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostAlpha');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible();
    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);

    // 2. Player joins room
    await playerPage.goto(`/?room=${roomCode}`);
    await playerPage.locator('#joinPlayerNameInput').fill('PlayerBeta');
    await playerPage.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await playerPage.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible();

    await hostPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });
    await playerPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });

    // 3. Host starts match
    await hostPage.locator('#lobbyStartBtn').click();
    await expect(hostPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 5000 });
    await expect(playerPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 5000 });

    // Fast forward countdown on both
    await hostPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide._secondsLeft = 0;
    });
    await playerPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide._secondsLeft = 0;
    });

    const hostHtaBtn = hostPage.locator('#htaHostStartBtn');
    await expect(hostHtaBtn).toBeVisible();
    await hostHtaBtn.click();

    // Both should enter gameScreen
    await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 15000 });
    await expect(playerPage.locator('#gameScreen')).toBeVisible({ timeout: 15000 });

    // 4. Player leaves/closes page mid-game
    console.log('[Test 1] PlayerBeta closes tab...');
    await playerPage.close();

    // Host should STILL be in gameScreen, NOT kicked to lobby!
    await hostPage.waitForTimeout(2000);
    await expect(hostPage.locator('#gameScreen')).toBeVisible();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeHidden();

    // 5. PlayerBeta reopens the page in playerContext (with same localStorage)
    console.log('[Test 1] PlayerBeta reopens page and confirms rejoin...');
    const playerNewPage = await playerContext.newPage();
    await playerNewPage.goto('/');

    await expect(playerNewPage.locator('#rejoinRoomModal')).toBeVisible({ timeout: 10000 });
    await playerNewPage.locator('#rejoinRoomModal .mp-btn-primary').click();

    // Player SHOULD return to gameScreen, NOT get stuck on playerLobbyScreen!
    await expect(playerNewPage.locator('#gameScreen')).toBeVisible({ timeout: 10000 });
    await expect(playerNewPage.locator('#playerLobbyScreen')).toBeHidden();

    const playerMatchActive = await playerNewPage.evaluate(() => MultiplayerEngine.isMatchActive);
    expect(playerMatchActive).toBe(true);

    // Host should still be in gameScreen
    await expect(hostPage.locator('#gameScreen')).toBeVisible();

    await hostContext.close();
    await playerContext.close();
  });

  test('Host leaves mid-game and rejoins: match must NOT restart or kick to lobby', async ({ browser }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/');
    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostAlpha');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible();
    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);

    // 2. Player joins room
    await playerPage.goto(`/?room=${roomCode}`);
    await playerPage.locator('#joinPlayerNameInput').fill('PlayerBeta');
    await playerPage.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await playerPage.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible();

    await hostPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });
    await playerPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });

    // 3. Host starts match
    await hostPage.locator('#lobbyStartBtn').click();
    await expect(hostPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 5000 });
    await expect(playerPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 5000 });

    await hostPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide._secondsLeft = 0;
    });
    await playerPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide._secondsLeft = 0;
    });

    const hostHtaBtn = hostPage.locator('#htaHostStartBtn');
    await expect(hostHtaBtn).toBeVisible();
    await hostHtaBtn.click();

    // Both should enter gameScreen
    await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 15000 });
    await expect(playerPage.locator('#gameScreen')).toBeVisible({ timeout: 15000 });

    // 4. Host leaves/closes page mid-game
    console.log('[Test 2] HostAlpha closes tab mid-game...');
    await hostPage.close();

    // PlayerBeta should become Host or stay in gameScreen without reset or kicking to lobby!
    await playerPage.waitForTimeout(3000);
    await expect(playerPage.locator('#gameScreen')).toBeVisible();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeHidden();

    // 5. HostAlpha reopens page and confirms rejoin
    console.log('[Test 2] HostAlpha reopens page and confirms rejoin...');
    const hostNewPage = await hostContext.newPage();
    await hostNewPage.goto('/');

    await expect(hostNewPage.locator('#rejoinRoomModal')).toBeVisible({ timeout: 10000 });
    await hostNewPage.locator('#rejoinRoomModal .mp-btn-primary').click();

    // HostAlpha SHOULD return to gameScreen, NOT get stuck on playerLobbyScreen!
    await expect(hostNewPage.locator('#gameScreen')).toBeVisible({ timeout: 10000 });
    await expect(hostNewPage.locator('#playerLobbyScreen')).toBeHidden();

    // PlayerBeta should STILL be in gameScreen
    await expect(playerPage.locator('#gameScreen')).toBeVisible();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeHidden();

    await hostContext.close();
    await playerContext.close();
  });
});
