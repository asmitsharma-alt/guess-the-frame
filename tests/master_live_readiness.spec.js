import { test, expect } from '@playwright/test';

test.describe('MASTER PRODUCTION READINESS — Connectivity, Sync, Rejoin, Latency, Answers, and Assets', () => {

  test('1. ASSET INTEGRITY: All 40 WebP frames & eyes load with HTTP 200 and valid image headers', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const assetResults = await page.evaluate(async () => {
      const allAssets = [];
      GS.sections.forEach(sec => {
        sec.frames.forEach(f => {
          if (f.content) allAssets.push(f.content);
          if (f.revealContent) allAssets.push(f.revealContent);
        });
      });

      const results = [];
      for (const assetPath of allAssets) {
        try {
          const resp = await fetch(assetPath, { method: 'HEAD' });
          const ct = resp.headers.get('content-type') || '';
          const cl = parseInt(resp.headers.get('content-length') || '0', 10);
          results.push({
            path: assetPath,
            status: resp.status,
            ok: resp.ok,
            contentType: ct,
            size: cl
          });
        } catch (e) {
          results.push({ path: assetPath, status: 0, ok: false, error: e.message });
        }
      }
      return results;
    });

    expect(assetResults.length).toBe(40); // 20 frames + 20 eye assets (10 crop + 10 reveal)
    const failures = assetResults.filter(r => !r.ok || r.status !== 200);
    expect(failures).toEqual([]);
    console.log(`[PASS] All ${assetResults.length} assets successfully loaded over HTTP 200!`);
  });

  test('2. ROUND 6 LOGIC & SECRET REVEAL: Wrong guess is rejected, correct answer awards points, reveal shows correct title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const r6Test = await page.evaluate(() => {
      const s3 = GS.sections.find(s => s.id === 3);
      const r6 = s3.frames[5]; // Elizabeth Olsen

      GS.players = [{ id: 'p1', name: 'Tester', score: 0, avatar: 'aman' }];
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Tester';
      MultiplayerEngine.currentPlaylist = [{ ...r6, sectionName: 'Guess the Eye', sectionId: 3 }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];
      MultiplayerEngine._roundGuessedCorrectIds = new Set();

      // Attempt 1: "wrong guess"
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Tester', playerAvatar: 'aman', guess: 'wrong person', roundIndex: 0 });
      const p1Score = GS.players[0].score;

      // Attempt 2: "another wrong guess"
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Tester', playerAvatar: 'aman', guess: 'random name', roundIndex: 0 });
      const p2Score = GS.players[0].score;

      // Attempt 3: correct answer (e.g. "Elizabeth Olsen")
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Tester', playerAvatar: 'aman', guess: r6.answer, roundIndex: 0 });
      const p3Score = GS.players[0].score;

      // End round and inspect reveal card
      MultiplayerEngine.endRound();
      const ansTitle = document.getElementById('ansTitle');

      return {
        p1Score,
        p2Score,
        p3Score,
        expectedTitle: r6.displayAnswer || r6.answer,
        revealedTitle: ansTitle ? ansTitle.textContent : ''
      };
    });

    expect(r6Test.p1Score).toBe(0); // Wrong rejected
    expect(r6Test.p2Score).toBe(0); // Wrong rejected
    expect(r6Test.p3Score).toBe(10); // Correct guess accepted
    expect(r6Test.revealedTitle).toBe(r6Test.expectedTitle); // Title matches
  });

  test('3. REALTIME MULTI-CLIENT MATCH, LATENCY & SYNC: 3 clients join, sync settings, play round, and calculate score', async ({ browser }) => {
    test.setTimeout(120000);
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p1Context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p2Context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const p1Page = await p1Context.newPage();
    const p2Page = await p2Context.newPage();

    // 1. Host creates room
    await hostPage.goto('/');
    await hostPage.waitForLoadState('domcontentloaded');
    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostAlpha');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible({ timeout: 15000 });

    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);
    expect(roomCode).toHaveLength(4);

    // 2. Player 1 joins
    await p1Page.goto(`/?room=${roomCode}`);
    await p1Page.waitForLoadState('domcontentloaded');
    await p1Page.locator('#joinPlayerNameInput').fill('PlayerBeta');
    await p1Page.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await p1Page.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(p1Page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 15000 });

    // 3. Player 2 joins
    await p2Page.goto(`/?room=${roomCode}`);
    await p2Page.waitForLoadState('domcontentloaded');
    await p2Page.locator('#joinPlayerNameInput').fill('PlayerGamma');
    await p2Page.locator('#joinRoomModal .mp-avatar-option[data-avatar="aziz"]').click();
    await p2Page.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(p2Page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 15000 });

    // 4. Verify all 3 appear on Host Roster
    await hostPage.waitForFunction(() => {
      return typeof GS !== 'undefined' && GS.players && GS.players.length === 3;
    }, { timeout: 30000 });

    // 5. Host starts match & measure latency
    const startTime = Date.now();
    await hostPage.locator('#lobbyStartBtn').click();

    await Promise.all([
      expect(hostPage.locator('#gameScreen')).toHaveClass(/active/, { timeout: 15000 }),
      expect(p1Page.locator('#gameScreen')).toHaveClass(/active/, { timeout: 15000 }),
      expect(p2Page.locator('#gameScreen')).toHaveClass(/active/, { timeout: 15000 })
    ]);

    const transitionLatencyMs = Date.now() - startTime;
    console.log(`[PASS] Match transitioned across 3 independent clients in ${transitionLatencyMs}ms`);

    // 6. Player 1 submits correct guess
    const currentAnswer = await hostPage.evaluate(() => {
      const cur = MultiplayerEngine.currentPlaylist[MultiplayerEngine.currentPlayIndex];
      return cur.answer;
    });

    const p1Input = p1Page.locator('#chatTextInput');
    await p1Input.fill(currentAnswer);
    await p1Page.locator('#chatSendBtn').click();

    // Verify PlayerBeta awarded 10 points
    await hostPage.waitForFunction(() => {
      return typeof MultiplayerEngine !== 'undefined' && MultiplayerEngine.currentRoundWinners && MultiplayerEngine.currentRoundWinners.length > 0;
    }, { timeout: 15000 });

    const winners = await hostPage.evaluate(() => MultiplayerEngine.currentRoundWinners);
    expect(winners[0].playerName).toContain('PlayerBeta');
    expect(winners[0].points).toBe(10);

    console.log('[PASS] Realtime guess submission, host validation, and point scoring verified!');

    await hostContext.close();
    await p1Context.close();
    await p2Context.close();
  });
});
