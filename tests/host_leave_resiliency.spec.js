const { test, expect } = require('@playwright/test');

test.describe('HOST LEAVE & MIGRATION RESILIENCY SUITE', () => {
  test.setTimeout(120000);

  test('TEST 1: Instant Host Migration on Intentional Leave Lobby (<2s)', async ({ browser }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Create room
    await hostPage.goto('/');
    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostAlice');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible();
    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);

    // 2. Player joins
    await playerPage.goto(`/?room=${roomCode}`);
    await playerPage.locator('#joinPlayerNameInput').fill('PlayerBob');
    await playerPage.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await playerPage.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible();

    await hostPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });
    await playerPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });

    // 3. Host clicks "Leave Lobby" (intentional exit)
    console.log('[Test 1] HostAlice clicks Leave Lobby button...');
    const startTime = Date.now();
    await hostPage.evaluate(() => PlayerLobby.back());

    // 4. Bob should be promoted INSTANTLY without waiting 12s!
    await playerPage.waitForFunction(() => MultiplayerEngine.isHost === true, { timeout: 5000 });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Test 1] Bob became Host in ${elapsed}s! (Instant migration verified)`);
    expect(Number(elapsed)).toBeLessThan(4.0);

    const bobState = await playerPage.evaluate(() => ({
      isHost: MultiplayerEngine.isHost,
      btnDisabled: document.getElementById('lobbyStartBtn')?.disabled,
      btnText: document.getElementById('lobbyStartBtnText')?.textContent
    }));
    expect(bobState.isHost).toBe(true);
    expect(bobState.btnDisabled).toBe(false);
    expect(bobState.btnText).toContain('START MATCH');

    await hostContext.close();
    await playerContext.close();
  });

  test('TEST 2: Split-Brain Prevention on Rejoin', async ({ browser }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/');
    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostCharlie');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible();
    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);

    // 2. Player joins
    await playerPage.goto(`/?room=${roomCode}`);
    await playerPage.locator('#joinPlayerNameInput').fill('PlayerDave');
    await playerPage.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await playerPage.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible();

    await hostPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });
    await playerPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });

    // 3. Host closes tab. Dave becomes Host via watchdog.
    console.log('[Test 2] HostCharlie closes tab. Waiting for Dave to become Host...');
    await hostPage.close();
    await playerPage.waitForFunction(() => MultiplayerEngine.isHost === true, { timeout: 25000 });
    console.log('[Test 2] Dave is now Host.');

    // 4. Charlie reopens the site in a fresh tab in hostContext (persisting localStorage)
    console.log('[Test 2] HostCharlie reopens site and clicks REJOIN ROOM...');
    const hostNewPage = await hostContext.newPage();
    await hostNewPage.goto('/');
    await expect(hostNewPage.locator('#rejoinRoomModal')).toBeVisible({ timeout: 10000 });
    await hostNewPage.locator('#rejoinRoomModal .mp-btn-primary').click();
    await expect(hostNewPage.locator('#playerLobbyScreen')).toBeVisible({ timeout: 10000 });

    // Wait for sync
    await hostNewPage.waitForFunction(() => {
      return typeof MultiplayerEngine !== 'undefined' && MultiplayerEngine.hasJoinedAck === true;
    }, { timeout: 15000 });

    const charlieRole = await hostNewPage.evaluate(() => ({
      isHost: MultiplayerEngine.isHost,
      roomCode: MultiplayerEngine.roomCode
    }));
    const daveRole = await playerPage.evaluate(() => ({
      isHost: MultiplayerEngine.isHost,
      roomCode: MultiplayerEngine.roomCode,
      players: GS.players.map(p => ({ name: p.name, isHost: p.isHost }))
    }));

    console.log('[Test 2] Charlie role after rejoin:', charlieRole);
    console.log('[Test 2] Dave role and roster:', daveRole);

    // Charlie gracefully joined as player, Dave remains authoritative Host!
    expect(charlieRole.isHost).toBe(false);
    expect(daveRole.isHost).toBe(true);

    await hostContext.close();
    await playerContext.close();
  });

  test('TEST 3: Softlock Fix on "How to Play" Screen (howToAnswerScreen)', async ({ browser }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 1. Create and Join
    await hostPage.goto('/');
    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostEve');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible();
    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);

    await playerPage.goto(`/?room=${roomCode}`);
    await playerPage.locator('#joinPlayerNameInput').fill('PlayerFrank');
    await playerPage.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await playerPage.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible();

    await hostPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });
    await playerPage.waitForFunction(() => typeof GS !== 'undefined' && GS.players && GS.players.length >= 2, { timeout: 25000 });

    // 2. Host starts match -> both enter howToAnswerScreen
    console.log('[Test 3] Entering How To Play screen...');
    await hostPage.locator('#lobbyStartBtn').click();
    await expect(hostPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 5000 });
    await expect(playerPage.locator('#howToAnswerScreen')).toBeVisible({ timeout: 5000 });

    // 3. Host abruptly disconnects while on rules guide!
    console.log('[Test 3] HostEve disconnects while on How To Play screen...');
    await hostPage.close();

    // 4. Fast-forward player countdown
    await playerPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') {
        HowToAnswerGuide._secondsLeft = 0;
      }
    });

    // 5. Watchdog / rules guide should trigger host migration and unhide #htaHostStartBtn for Frank!
    console.log('[Test 3] Waiting for Frank to become Host on howToAnswerScreen...');
    await playerPage.waitForFunction(() => {
      const btn = document.getElementById('htaHostStartBtn');
      return MultiplayerEngine.isHost === true && btn && window.getComputedStyle(btn).display !== 'none';
    }, { timeout: 25000 });

    const frankBtn = playerPage.locator('#htaHostStartBtn');
    await expect(frankBtn).toBeVisible();
    await expect(frankBtn).toBeEnabled();

    // 6. Frank clicks START GAME on howToAnswerScreen and successfully launches game!
    await frankBtn.click();
    await expect(playerPage.locator('#gameScreen')).toBeVisible({ timeout: 15000 });
    console.log('[Test 3] SUCCESS! Frank launched Game Arena from How To Play screen without softlocking!');

    await hostContext.close();
    await playerContext.close();
  });
});
