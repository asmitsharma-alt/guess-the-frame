const { test, expect } = require('@playwright/test');

test.describe('P0 Lobby Join Reliability Suite', () => {

  test('Scenario A & C: Normal Join + In-flight Double Click Guard', async ({ browser }) => {
    // 1. Host creates room
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto('/');
    await hostPage.click('.h-card-create');
    await hostPage.fill('#hostPlayerNameInput', 'HostPlayer');
    await hostPage.click('#createRoomModal .mp-btn-primary');
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible();

    const roomCode = await hostPage.evaluate(() => window.MultiplayerEngine.roomCode);
    expect(roomCode).toBeTruthy();

    // 2. Player joins with rapid double click
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto('/');
    await playerPage.click('.h-card-join');
    await playerPage.fill('#joinCodeInput', roomCode);
    await playerPage.fill('#joinPlayerNameInput', 'FastClicker');

    const joinBtn = playerPage.locator('#joinRoomModal .mp-btn-primary');
    // Double click rapidly
    await joinBtn.click({ clickCount: 2, delay: 50 });

    // Player should transition to playerLobbyScreen upon confirmation
    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible({ timeout: 10000 });

    // Host roster should contain exactly 2 unique players (no duplicate FastClicker)
    await hostPage.waitForTimeout(1000);
    const hostPlayers = await hostPage.evaluate(() => GS.players);
    expect(hostPlayers.length).toBe(2);
    const fastClickers = hostPlayers.filter(p => p.name === 'FastClicker');
    expect(fastClickers.length).toBe(1);

    await hostContext.close();
    await playerContext.close();
  });

  test('Scenario I: Invalid Room Code cleanly aborts with actionable message and restores button', async ({ page }) => {
    await page.goto('/');
    await page.click('.h-card-join');
    await page.fill('#joinCodeInput', 'ZZ99');
    await page.fill('#joinPlayerNameInput', 'LostPlayer');

    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const joinBtn = page.locator('#joinRoomModal .mp-btn-primary');
    await joinBtn.click();

    // Button should show connecting state
    await expect(joinBtn).toHaveText(/Connecting/);
    await expect(joinBtn).toBeDisabled();

    // After 15s timeout, dialog should fire and button should be restored
    await page.waitForTimeout(16500);

    expect(dialogMessage).toContain('Lobby not found');
    await expect(joinBtn).toBeEnabled();
    await expect(joinBtn).toHaveText(/ENTER ROOM/);
    // Should NOT have navigated to phantom lobby
    await expect(page.locator('#homeScreen')).toBeVisible();
    await expect(page.locator('#playerLobbyScreen')).toBeHidden();
  });

  test('Scenario J: Full Lobby (8 players) authoritatively rejects 9th player', async ({ page }) => {
    await page.goto('/');
    // Setup a simulated host with 8 players
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'FULL';
      MultiplayerEngine.hostSettings = { maxPlayers: 8 };
      GS.players = Array.from({ length: 8 }, (_, i) => ({
        id: 'p_' + i,
        name: 'Player ' + i,
        avatar: 'aman',
        isHost: i === 0,
        score: 0
      }));
    });

    let sentEvent = null;
    await page.evaluate(() => {
      const origSend = MultiplayerEngine.sendEvent.bind(MultiplayerEngine);
      MultiplayerEngine.sendEvent = (type, payload) => {
        window._lastSent = { type, payload };
        return origSend(type, payload);
      };
    });

    // Simulate 9th player attempting to join
    await page.evaluate(() => {
      MultiplayerEngine.handleIncomingEvent({
        type: 'PLAYER_JOIN',
        roomCode: 'FULL',
        senderId: 'p_ninth',
        id: 'p_ninth',
        name: 'NinthPlayer',
        avatar: 'amish',
        timestamp: Date.now()
      });
    });

    const lastSent = await page.evaluate(() => window._lastSent);
    expect(lastSent).toBeTruthy();
    expect(lastSent.type).toBe('JOIN_REJECTED');
    expect(lastSent.payload.reason).toBe('LOBBY_FULL');
    expect(lastSent.payload.targetPlayerId).toBe('p_ninth');

    // Verify player was not added
    const playerCount = await page.evaluate(() => GS.players.length);
    expect(playerCount).toBe(8);
  });

  test('Scenario K: Active Match authoritatively rejects joining player', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'PLAY';
      MultiplayerEngine.isMatchActive = true;
      GS.players = [
        { id: 'p_host', name: 'Host', isHost: true }
      ];
    });

    await page.evaluate(() => {
      MultiplayerEngine.sendEvent = (type, payload) => {
        window._lastSent = { type, payload };
      };
    });

    // Simulate incoming join during active match
    await page.evaluate(() => {
      MultiplayerEngine.handleIncomingEvent({
        type: 'PLAYER_JOIN',
        roomCode: 'PLAY',
        senderId: 'p_late',
        id: 'p_late',
        name: 'LatePlayer',
        avatar: 'vish',
        timestamp: Date.now()
      });
    });

    const lastSent = await page.evaluate(() => window._lastSent);
    expect(lastSent).toBeTruthy();
    expect(lastSent.type).toBe('JOIN_REJECTED');
    expect(lastSent.payload.reason).toBe('GAME_ALREADY_STARTED');
  });

  test('Scenario M: Player Identity stability across reloads (localStorage persistence)', async ({ page }) => {
    await page.goto('/');
    const initialId = await page.evaluate(() => MultiplayerEngine.playerId);
    expect(initialId).toBeTruthy();

    // Reload page
    await page.reload();
    const reloadedId = await page.evaluate(() => MultiplayerEngine.playerId);
    expect(reloadedId).toBe(initialId);
  });

  test('Scenario L: Player leaving during active match does NOT kick remaining players to lobby', async ({ page }) => {
    await page.goto('/');
    // Simulate active game in progress
    await page.evaluate(() => {
      MultiplayerEngine.isHost = false;
      MultiplayerEngine.hasJoinedAck = true;
      MultiplayerEngine.isJoining = false;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.roomCode = 'GAME';
      MultiplayerEngine.playerId = 'p_keep_playing';
      GS.players = [
        { id: 'p_host', name: 'Host', isHost: true, score: 10 },
        { id: 'p_keep_playing', name: 'Player1', isHost: false, score: 5 },
        { id: 'p_leaver', name: 'Leaver', isHost: false, score: 0 }
      ];
      UI.showScreen('gameScreen');
    });

    // Verify currently on gameScreen
    await expect(page.locator('#gameScreen')).toBeVisible();

    // Simulate another player leaving and host broadcasting state sync
    await page.evaluate(() => {
      MultiplayerEngine.handleIncomingEvent({
        type: 'PLAYER_LEAVE',
        roomCode: 'GAME',
        senderId: 'p_leaver',
        playerId: 'p_leaver',
        timestamp: Date.now()
      });

      MultiplayerEngine.handleIncomingEvent({
        type: 'SYNC_ROOM_STATE',
        roomCode: 'GAME',
        senderId: 'p_host',
        players: [
          { id: 'p_host', name: 'Host', isHost: true, score: 10 },
          { id: 'p_keep_playing', name: 'Player1', isHost: false, score: 5 }
        ],
        timestamp: Date.now()
      });
    });

    // Crucial check: Screen MUST still be gameScreen, NOT kicked to playerLobbyScreen!
    await expect(page.locator('#gameScreen')).toBeVisible();
    await expect(page.locator('#playerLobbyScreen')).toBeHidden();

    // Leaderboard roster should be updated to 2 players
    const playerCount = await page.evaluate(() => GS.players.length);
    expect(playerCount).toBe(2);
  });

});
