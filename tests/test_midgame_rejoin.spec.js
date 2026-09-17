const { test, expect } = require('@playwright/test');

test.describe('Mid-Game Leave and Rejoin Score Restoration & Persistence Engine', () => {
  test.setTimeout(120000);

  test('Player leaves mid-game and rejoins: should resume gameScreen and restore 100% of points', async ({ browser }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/');
    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostAlpha');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });
    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);

    // 2. Player joins room
    await playerPage.goto(`/?room=${roomCode}`);
    await playerPage.locator('#joinPlayerNameInput').fill('PlayerBeta');
    await playerPage.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await playerPage.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });

    await hostPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });
    await playerPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });

    // 3. Host starts match
    await hostPage.locator('#lobbyStartBtn').click();
    await expect(hostPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 10000 });
    await expect(playerPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 10000 });

    // Fast forward countdown on both
    await hostPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide._secondsLeft = 0;
    });
    await playerPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide._secondsLeft = 0;
    });

    const hostHtaBtn = hostPage.locator('#htaHostStartBtn');
    await expect(hostHtaBtn).toBeVisible({ timeout: 10000 });
    await hostHtaBtn.click();

    // Both should enter gameScreen
    await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 20000 });
    await expect(playerPage.locator('#gameScreen')).toBeVisible({ timeout: 20000 });

    // 4. PlayerBeta scores 10 points by answering the frame
    const currentAnswer = await playerPage.evaluate(() => {
      const cur = MultiplayerEngine.currentPlaylist?.[MultiplayerEngine.currentPlayIndex];
      return cur ? cur.answer : 'Dangal';
    });
    console.log('[Test 1] Current answer is:', currentAnswer);
    await playerPage.locator('#chatTextInput').fill(currentAnswer);
    await playerPage.locator('#chatSendBtn').click();

    // Wait for PlayerBeta's score to register
    await playerPage.waitForFunction(() => {
      const me = GS.players?.find(p => p.name === 'PlayerBeta');
      return me && me.score >= 10;
    }, { timeout: 15000 });

    const scoreBeforeLeave = await playerPage.evaluate(() => {
      const me = GS.players?.find(p => p.name === 'PlayerBeta');
      return me ? me.score : 0;
    });
    expect(scoreBeforeLeave).toBeGreaterThanOrEqual(10);
    console.log(`[Test 1] PlayerBeta scored ${scoreBeforeLeave} points before leaving.`);

    // 5. Player leaves/closes page mid-game
    console.log('[Test 1] PlayerBeta closes tab mid-game...');
    await playerPage.close();

    // Host should STILL be in gameScreen, NOT kicked to lobby!
    await hostPage.waitForTimeout(2000);
    await expect(hostPage.locator('#gameScreen')).toBeVisible();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeHidden();

    // 6. PlayerBeta reopens the page in playerContext (with same localStorage)
    console.log('[Test 1] PlayerBeta reopens page and confirms rejoin...');
    const playerNewPage = await playerContext.newPage();
    await playerNewPage.goto('/');

    await expect(playerNewPage.locator('#rejoinRoomModal')).toBeVisible({ timeout: 15000 });
    await playerNewPage.locator('#rejoinRoomModal .mp-btn-primary').click();

    // Player SHOULD return to gameScreen, NOT get stuck on playerLobbyScreen!
    await expect(playerNewPage.locator('#gameScreen')).toBeVisible({ timeout: 15000 });
    await expect(playerNewPage.locator('#playerLobbyScreen')).toBeHidden();

    const playerMatchActive = await playerNewPage.evaluate(() => MultiplayerEngine.isMatchActive);
    expect(playerMatchActive).toBe(true);

    // 7. Verify PlayerBeta's score is 100% RESTORED on both playerNewPage and hostPage!
    await playerNewPage.waitForFunction((expected) => {
      const me = GS.players?.find(p => p.name === 'PlayerBeta');
      return me && me.score === expected;
    }, scoreBeforeLeave, { timeout: 15000 });

    await hostPage.waitForFunction((expected) => {
      const p = GS.players?.find(p => p.name === 'PlayerBeta');
      return p && p.score === expected;
    }, scoreBeforeLeave, { timeout: 15000 });

    const restoredOnPlayer = await playerNewPage.evaluate(() => {
      const me = GS.players?.find(p => p.name === 'PlayerBeta');
      return me ? me.score : 0;
    });
    const restoredOnHost = await hostPage.evaluate(() => {
      const p = GS.players?.find(p => p.name === 'PlayerBeta');
      return p ? p.score : 0;
    });

    console.log(`[Test 1] Score restored: on Player = ${restoredOnPlayer}, on Host = ${restoredOnHost}`);
    expect(restoredOnPlayer).toBe(scoreBeforeLeave);
    expect(restoredOnHost).toBe(scoreBeforeLeave);

    await hostContext.close();
    await playerContext.close();
  });

  test('Host leaves mid-game and rejoins: score preserved and match continues', async ({ browser }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/');
    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostAlpha');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });
    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);

    // 2. Player joins room
    await playerPage.goto(`/?room=${roomCode}`);
    await playerPage.locator('#joinPlayerNameInput').fill('PlayerBeta');
    await playerPage.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await playerPage.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });

    await hostPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });
    await playerPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });

    // 3. Host starts match
    await hostPage.locator('#lobbyStartBtn').click();
    await expect(hostPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 10000 });
    await expect(playerPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 10000 });

    await hostPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide._secondsLeft = 0;
    });
    await playerPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide._secondsLeft = 0;
    });

    const hostHtaBtn = hostPage.locator('#htaHostStartBtn');
    await expect(hostHtaBtn).toBeVisible({ timeout: 10000 });
    await hostHtaBtn.click();

    // Both should enter gameScreen
    await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 20000 });
    await expect(playerPage.locator('#gameScreen')).toBeVisible({ timeout: 20000 });

    // 4. HostAlpha scores 10 points
    const currentAnswer = await hostPage.evaluate(() => {
      const cur = MultiplayerEngine.currentPlaylist?.[MultiplayerEngine.currentPlayIndex];
      return cur ? cur.answer : 'Dangal';
    });
    console.log('[Test 2] Current answer is:', currentAnswer);
    await hostPage.locator('#chatTextInput').fill(currentAnswer);
    await hostPage.locator('#chatSendBtn').click();

    await hostPage.waitForFunction(() => {
      const me = GS.players?.find(p => p.name === 'HostAlpha');
      return me && me.score >= 10;
    }, { timeout: 15000 });

    const hostScoreBeforeLeave = await hostPage.evaluate(() => {
      const me = GS.players?.find(p => p.name === 'HostAlpha');
      return me ? me.score : 0;
    });
    expect(hostScoreBeforeLeave).toBeGreaterThanOrEqual(10);
    console.log(`[Test 2] HostAlpha scored ${hostScoreBeforeLeave} points before leaving.`);

    // 5. Host leaves/closes page mid-game
    console.log('[Test 2] HostAlpha closes tab mid-game...');
    await hostPage.close();

    // PlayerBeta should become Host or stay in gameScreen without reset or kicking to lobby!
    await playerPage.waitForTimeout(3000);
    await expect(playerPage.locator('#gameScreen')).toBeVisible();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeHidden();

    // 6. HostAlpha reopens page and confirms rejoin
    console.log('[Test 2] HostAlpha reopens page and confirms rejoin...');
    const hostNewPage = await hostContext.newPage();
    await hostNewPage.goto('/');

    await expect(hostNewPage.locator('#rejoinRoomModal')).toBeVisible({ timeout: 15000 });
    await hostNewPage.locator('#rejoinRoomModal .mp-btn-primary').click();

    // HostAlpha SHOULD return to gameScreen, NOT get stuck on playerLobbyScreen!
    await expect(hostNewPage.locator('#gameScreen')).toBeVisible({ timeout: 15000 });
    await expect(hostNewPage.locator('#playerLobbyScreen')).toBeHidden();

    // PlayerBeta should STILL be in gameScreen
    await expect(playerPage.locator('#gameScreen')).toBeVisible();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeHidden();

    // 7. Verify HostAlpha's score is restored
    await hostNewPage.waitForFunction((expected) => {
      const me = GS.players?.find(p => p.name === 'HostAlpha');
      return me && me.score === expected;
    }, hostScoreBeforeLeave, { timeout: 15000 });

    const hostRestored = await hostNewPage.evaluate(() => {
      const me = GS.players?.find(p => p.name === 'HostAlpha');
      return me ? me.score : 0;
    });
    console.log(`[Test 2] HostAlpha score restored: ${hostRestored}`);
    expect(hostRestored).toBe(hostScoreBeforeLeave);

    await hostContext.close();
    await playerContext.close();
  });
});
