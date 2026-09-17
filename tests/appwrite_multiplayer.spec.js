const { test, expect } = require('@playwright/test');

test.describe('ScoopCast Appwrite Multiplayer E2E', () => {
  test('Two players create room, join via Appwrite Realtime, start match, and guess answer', async ({ browser }) => {
    // 1. Host Context
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const hostPage = await hostContext.newPage();

    // 2. Player 2 Context
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerPage = await playerContext.newPage();

    hostPage.on('console', msg => console.log('[Host Console]', msg.type(), msg.text()));
    playerPage.on('console', msg => console.log('[Player Console]', msg.type(), msg.text()));
    playerPage.on('pageerror', err => console.log('[Player PageError]', err.message));

    console.log('[Test] Loading Host page...');
    await hostPage.goto('http://localhost:8080/');
    await hostPage.waitForLoadState('domcontentloaded');

    // Wait for Appwrite auth initialization
    await hostPage.waitForTimeout(1000);

    // Host clicks Create Room
    console.log('[Test] Host clicking Create Room...');
    const createBtn = hostPage.locator('.h-card-create');
    await createBtn.click();

    await hostPage.waitForSelector('#createRoomModal.active', { timeout: 5000 });
    const hostNameInput = hostPage.locator('#hostPlayerNameInput');
    await hostNameInput.fill('HostAman');

    // Confirm Create Room
    const confirmCreateBtn = hostPage.locator('#createRoomModal .mp-btn-primary');
    await confirmCreateBtn.click();

    // Wait for lobby screen
    await hostPage.waitForSelector('#playerLobbyScreen.active', { timeout: 10000 });
    console.log('[Test] Host reached lobby screen!');

    // Read room code from UI
    const roomCodeElement = hostPage.locator('#displayRoomCode, #lobbyRoomCode, .badge-id-val, #hfbRoomCode').first();
    await expect(roomCodeElement).toBeVisible({ timeout: 5000 });
    const roomCode = (await roomCodeElement.textContent()).trim();
    console.log(`[Test] Generated Room Code: "${roomCode}"`);
    expect(roomCode.length).toBeGreaterThanOrEqual(4);

    // Player 2 opens game and joins room
    console.log('[Test] Loading Player 2 page...');
    await playerPage.goto('http://localhost:8080/');
    await playerPage.waitForLoadState('domcontentloaded');
    await playerPage.waitForTimeout(1000);

    console.log('[Test] Player 2 clicking Join Room...');
    const joinBtn = playerPage.locator('.h-card-join');
    await joinBtn.click();

    await playerPage.waitForSelector('#joinRoomModal.active', { timeout: 5000 });
    const joinCodeInput = playerPage.locator('#joinCodeInput');
    await joinCodeInput.fill(roomCode);
    const joinNameInput = playerPage.locator('#joinPlayerNameInput');
    await joinNameInput.fill('PlayerAmish');

    // Select different avatar
    const amishAvatar = playerPage.locator('#joinRoomModal .avatar-option[data-avatar="amish"]');
    if (await amishAvatar.isVisible()) {
      await amishAvatar.click();
    }

    const confirmJoinBtn = playerPage.locator('#joinRoomModal .mp-btn-primary');
    await confirmJoinBtn.click();

    // Player 2 should enter lobby screen
    await playerPage.waitForSelector('#playerLobbyScreen.active', { timeout: 10000 });
    console.log('[Test] Player 2 entered lobby screen!');

    // Verify Realtime Lobby Sync: both pages should show 2 players
    await playerPage.waitForTimeout(3000);

    console.log('[Test] Verifying lobby player synchronization via Appwrite Realtime...');
    expect(await hostPage.evaluate(() => GS.players.length)).toBe(2);
    expect(await playerPage.evaluate(() => GS.players.length)).toBe(2);

    // Host starts match
    console.log('[Test] Host starting match...');
    const startMatchBtn = hostPage.locator('#lobbyStartBtn, #startMatchBtn, .btn-start-match').first();
    await startMatchBtn.click();

    // Both clients should transition to gameScreen
    await hostPage.waitForSelector('#gameScreen.active', { timeout: 10000 });
    await playerPage.waitForSelector('#gameScreen.active', { timeout: 10000 });
    console.log('[Test] Both players entered game screen!');

    // Wait for Round 1 to start
    await hostPage.waitForTimeout(2000);

    // Verify image loading: Frame image should be loaded without 130MB flood
    const frameImg = playerPage.locator('#imageContainer img');
    await expect(frameImg).toBeVisible({ timeout: 5000 });
    console.log('[Test] Round 1 image successfully rendered!');

    // Player 2 submits correct guess: "3 idiots"
    console.log('[Test] Player 2 submitting guess: "3 idiots"...');
    const guessInput = playerPage.locator('#chatTextInput, #onlineGuessInput').first();
    await expect(guessInput).toBeVisible({ timeout: 5000 });
    await guessInput.fill('3 idiots');
    const submitGuessBtn = playerPage.locator('#chatSendBtn, #onlineGuessSubmitBtn').first();
    await submitGuessBtn.click();

    // Verify guess feedback pill displays "Correct!"
    const feedbackPill = playerPage.locator('#guessFeedbackPill');
    await expect(feedbackPill).toBeVisible({ timeout: 5000 });
    await expect(feedbackPill).toContainText('Correct', { timeout: 15000 });
    const feedbackText = await feedbackPill.textContent();
    console.log(`[Test] Guess feedback: "${feedbackText}"`);
    expect(feedbackText).toContain('Correct');

    // Verify score update via Appwrite Realtime on both screens
    console.log('[Test] Waiting for Player 2 score update on Host screen via Appwrite Realtime...');
    await hostPage.waitForFunction(() => {
      const p2 = (typeof GS !== 'undefined' && GS.players) ? GS.players.find(p => p.name === 'PlayerAmish') : null;
      return p2 && p2.score === 10;
    }, { timeout: 12000 });

    const p2ScoreOnHost = await hostPage.evaluate(() => {
      const p2 = GS.players.find(p => p.name === 'PlayerAmish');
      return p2 ? p2.score : 0;
    });
    console.log(`[Test] Player 2 score on Host screen: ${p2ScoreOnHost}`);
    expect(p2ScoreOnHost).toBe(10);

    // Test Page Visibility handling (simulated background switch)
    console.log('[Test] Testing Page Visibility resume...');
    await playerPage.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await playerPage.waitForTimeout(1000);

    await playerPage.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await playerPage.waitForTimeout(1000);

    // Player should remain connected without lost score
    const p2ScoreAfterResume = await playerPage.evaluate(() => {
      const p2 = GS.players.find(p => p.name === 'PlayerAmish');
      return p2 ? p2.score : 0;
    });
    expect(p2ScoreAfterResume).toBe(10);
    console.log('[Test] Page Visibility test passed! Player score and session preserved.');

    await hostContext.close();
    await playerContext.close();
    console.log('[Test] Appwrite Multiplayer E2E Test completed successfully!');
  });
});
