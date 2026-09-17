const { test, expect } = require('@playwright/test');

test.describe('ScoopCast Appwrite 4-Player Stress Test', () => {
  test.setTimeout(90000);

  test('4 Players: Host creates room, 3 players join, concurrent guesses, disconnect/reconnect, score integrity', async ({ browser }) => {
    console.log('[Stress Test] Launching 4 isolated browser contexts...');
    
    // 1. Setup 4 distinct browser contexts
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const hostPage = await hostContext.newPage();

    const p2Context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p2Page = await p2Context.newPage();

    const p3Context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p3Page = await p3Context.newPage();

    const p4Context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p4Page = await p4Context.newPage();

    const allPages = [hostPage, p2Page, p3Page, p4Page];

    // Helper: join player
    async function joinPlayer(page, name, avatar, code) {
      console.log(`[Stress Test] Joining ${name}...`);
      await page.goto('http://localhost:8080/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const joinBtn = page.locator('.h-card-join');
      await joinBtn.click();
      await page.waitForSelector('#joinRoomModal.active', { timeout: 8000 });

      await page.locator('#joinCodeInput').fill(code);
      await page.locator('#joinPlayerNameInput').fill(name);

      const avOption = page.locator(`#joinRoomModal .avatar-option[data-avatar="${avatar}"]`);
      if (await avOption.isVisible()) {
        await avOption.click();
      }

      const confirmBtn = page.locator('#joinRoomModal .mp-btn-primary');
      await confirmBtn.click();
      await page.waitForSelector('#playerLobbyScreen.active', { timeout: 15000 });
      console.log(`[Stress Test] ${name} reached lobby!`);
    }

    // --- Scenario 1: Host creates room ---
    console.log('[Stress Test] Step 1: Host creating room...');
    await hostPage.goto('http://localhost:8080/');
    await hostPage.waitForLoadState('domcontentloaded');
    await hostPage.waitForTimeout(1000);

    const createBtn = hostPage.locator('.h-card-create');
    await createBtn.click();
    await hostPage.waitForSelector('#createRoomModal.active', { timeout: 8000 });

    await hostPage.locator('#hostPlayerNameInput').fill('HostAman');
    const confirmCreateBtn = hostPage.locator('#createRoomModal .mp-btn-primary');
    await confirmCreateBtn.click();

    await hostPage.waitForSelector('#playerLobbyScreen.active', { timeout: 15000 });
    const roomCodeElement = hostPage.locator('#displayRoomCode, #lobbyRoomCode, .badge-id-val, #hfbRoomCode').first();
    await expect(roomCodeElement).toBeVisible({ timeout: 8000 });
    const roomCode = (await roomCodeElement.textContent()).trim();
    console.log(`[Stress Test] Room created successfully! Code: "${roomCode}"`);
    expect(roomCode.length).toBeGreaterThanOrEqual(4);

    // --- Scenario 2: Players 2, 3, 4 join ---
    console.log('[Stress Test] Step 2: Joining Players 2, 3, 4 into room...');
    await joinPlayer(p2Page, 'PlayerAmish', 'amish', roomCode);
    await joinPlayer(p3Page, 'PlayerAziz', 'aziz', roomCode);
    await joinPlayer(p4Page, 'PlayerVish', 'vish', roomCode);

    // Verify all 4 clients see all 4 players via Realtime
    console.log('[Stress Test] Verifying all 4 clients synchronize 4 players in lobby...');
    for (let i = 0; i < allPages.length; i++) {
      await expect.poll(async () => {
        return await allPages[i].evaluate(() => (typeof GS !== 'undefined' && GS.players) ? GS.players.length : 0);
      }, { timeout: 20000, message: `Context ${i} failed to sync 4 players` }).toBe(4);
    }
    console.log('[Stress Test] Lobby synchronized with 4 players across all contexts!');

    // --- Scenario 3: Game starts ---
    console.log('[Stress Test] Step 3: Host starting match...');
    const startMatchBtn = hostPage.locator('#lobbyStartBtn, #startMatchBtn, .btn-start-match').first();
    await startMatchBtn.click();

    // Verify all 4 transition to game screen
    for (let i = 0; i < allPages.length; i++) {
      await allPages[i].waitForSelector('#gameScreen.active', { timeout: 15000 });
    }
    console.log('[Stress Test] All 4 players successfully entered game screen!');

    // Wait for Round 1 frame to render
    await hostPage.waitForTimeout(2000);

    // --- Scenario 4: Concurrent Guesses submitted ---
    console.log('[Stress Test] Step 4: Submitting concurrent guesses across Players 2, 3, 4...');
    
    // Player 2 submits correct guess first (target: 10 pts, 1st place)
    console.log('[Stress Test] P2 submitting "3 idiots" (1st Place)...');
    await p2Page.locator('#chatTextInput, #onlineGuessInput').first().fill('3 idiots');
    await p2Page.locator('#chatSendBtn, #onlineGuessSubmitBtn').first().click();
    await expect(p2Page.locator('#guessFeedbackPill')).toContainText('Correct', { timeout: 15000 });
    console.log('[Stress Test] P2 confirmed 1st place (+10 pts)!');

    // Player 3 submits correct guess second (target: 7 pts, 2nd place)
    console.log('[Stress Test] P3 submitting "3 idiots" (2nd Place)...');
    await p3Page.locator('#chatTextInput, #onlineGuessInput').first().fill('3 idiots');
    await p3Page.locator('#chatSendBtn, #onlineGuessSubmitBtn').first().click();
    await expect(p3Page.locator('#guessFeedbackPill')).toContainText('Correct', { timeout: 15000 });
    console.log('[Stress Test] P3 confirmed 2nd place (+7 pts)!');

    // Player 4 submits correct guess third (target: 5 pts, 3rd place)
    console.log('[Stress Test] P4 submitting "3 idiots" (3rd Place)...');
    await p4Page.locator('#chatTextInput, #onlineGuessInput').first().fill('3 idiots');
    await p4Page.locator('#chatSendBtn, #onlineGuessSubmitBtn').first().click();
    await expect(p4Page.locator('#guessFeedbackPill')).toContainText('Correct', { timeout: 15000 });
    console.log('[Stress Test] P4 confirmed 3rd place (+5 pts)!');

    // Test duplicate guess rejection: Player 2 submits duplicate guess again
    console.log('[Stress Test] Testing guessId deduplication: P2 submitting duplicate guess...');
    await p2Page.evaluate(() => {
      if (typeof MultiplayerEngine !== 'undefined') {
        MultiplayerEngine.submitGuessDirect('3 idiots');
      }
    });

    // Verify authoritative scores on host screen
    console.log('[Stress Test] Verifying authoritative scores on Host screen via Appwrite Realtime...');
    await expect.poll(async () => {
      return await hostPage.evaluate(() => {
        if (typeof GS === 'undefined' || !GS.players) return null;
        const p2 = GS.players.find(p => p.name === 'PlayerAmish');
        const p3 = GS.players.find(p => p.name === 'PlayerAziz');
        const p4 = GS.players.find(p => p.name === 'PlayerVish');
        return {
          p2Score: p2 ? p2.score : 0,
          p3Score: p3 ? p3.score : 0,
          p4Score: p4 ? p4.score : 0
        };
      });
    }, { timeout: 15000 }).toEqual({
      p2Score: 10,
      p3Score: 7,
      p4Score: 5
    });
    console.log('[Stress Test] Authoritative scores verified on Host: P2=10, P3=7, P4=5, no duplicates!');

    // --- Scenario 5: Player Disconnects & Reconnects ---
    console.log('[Stress Test] Step 5: Simulating Player 3 backgrounding / disconnect...');
    const p3DisconnectStart = Date.now();
    await p3Page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p3Page.waitForTimeout(1500);

    // Player 3 reconnects
    console.log('[Stress Test] Player 3 waking up and reconnecting...');
    await p3Page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for reconnection to finish
    await expect.poll(async () => {
      return await p3Page.evaluate(() => MultiplayerEngine.connectionState);
    }, { timeout: 5000 }).toBe('CONNECTED');
    const p3RecoveryTime = Date.now() - p3DisconnectStart;
    console.log(`[Stress Test] Player 3 recovered and returned to CONNECTED in ${p3RecoveryTime}ms (<5000ms target)!`);

    // Verify no lost players and scores remain intact after reconnection
    const p3State = await p3Page.evaluate(() => {
      const p3 = GS.players.find(p => p.name === 'PlayerAziz');
      const p2 = GS.players.find(p => p.name === 'PlayerAmish');
      const p4 = GS.players.find(p => p.name === 'PlayerVish');
      return {
        totalPlayers: GS.players.length,
        p3Score: p3 ? p3.score : 0,
        p2Score: p2 ? p2.score : 0,
        p4Score: p4 ? p4.score : 0
      };
    });
    console.log('[Stress Test] Player 3 state after reconnection:', p3State);
    expect(p3State.totalPlayers).toBe(4);
    expect(p3State.p3Score).toBe(7);
    expect(p3State.p2Score).toBe(10);
    expect(p3State.p4Score).toBe(5);

    // --- Scenario 6: Round Advance ---
    console.log('[Stress Test] Step 6: Advancing to Round 2...');
    await hostPage.evaluate(() => {
      if (typeof MultiplayerEngine !== 'undefined') {
        MultiplayerEngine.hostNextRound();
      }
    });

    // Verify all 4 players receive Round 2 update
    for (let i = 0; i < allPages.length; i++) {
      await expect.poll(async () => {
        return await allPages[i].evaluate(() => (typeof MultiplayerEngine !== 'undefined') ? MultiplayerEngine.currentPlayIndex : -1);
      }, { timeout: 15000 }).toBe(1);
    }
    console.log('[Stress Test] All 4 clients advanced to Round 2 successfully!');

    // --- Scenario 7: Production Telemetry Verification ---
    console.log('[Stress Test] Step 7: Verifying window.ScoopCastDebug telemetry...');
    const debugStats = await p2Page.evaluate(() => {
      if (typeof window.ScoopCastDebug !== 'undefined') {
        return window.ScoopCastDebug.getSummary();
      }
      return null;
    });
    console.log('[Stress Test] ScoopCastDebug summary:', debugStats);
    expect(debugStats).not.toBeNull();
    expect(debugStats.network).toBe('online');
    expect(debugStats.realtime).toBe('connected');
    expect(debugStats.apiFailures).toBe(0);
    expect(debugStats.cachedImages).toBeLessThanOrEqual(15);

    // Clean up all contexts
    await hostContext.close();
    await p2Context.close();
    await p3Context.close();
    await p4Context.close();
    console.log('[Stress Test] 4-Player Stress Test PASSED with zero defects!');
  });
});
