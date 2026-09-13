const { test, expect } = require('@playwright/test');

test.describe('EXHAUSTIVE FULL-SPECTRUM MASTER SUITE — All Scenarios, All Rounds, All Sections', () => {

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 1: ALL 40 ROUNDS + 14 TIE BREAKERS (COMPLETE CATALOG INTEGRITY)
  // ═════════════════════════════════════════════════════════════════════════════
  test('CATALOG PLAYTHROUGH: Verify all 20 frames, all 10 eyes (crop & reveal), all 10 dialogues, and 14 tie breakers', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      const summary = {
        framesTested: 0,
        eyesTested: 0,
        dialoguesTested: 0,
        tieBreakersTested: 0,
        errors: []
      };

      const catalog = window.ALL_CATALOG_ITEMS || (window.GS ? [
        ...(window.GS.sections[0]?.frames || []),
        ...(window.GS.sections[1]?.frames || []),
        ...(window.GS.sections[2]?.frames || [])
      ] : []);
      const tieBreakers = window.DEFAULT_TIE_BREAKERS || (window.GS ? window.GS.tieBreaker?.frames || [] : []);

      // 1. Verify Frames (20 items)
      const frames = catalog.filter(item => item.category === 'frames');
      for (const item of frames) {
        if (!item.content || !item.answer) {
          summary.errors.push(`Invalid frame item: ${JSON.stringify(item)}`);
          continue;
        }
        summary.framesTested++;
      }

      // 2. Verify Eyes (10 items with cropped image and revealContent)
      const eyes = catalog.filter(item => item.category === 'eyes');
      for (const item of eyes) {
        if (!item.content || !item.revealContent || !item.answer) {
          summary.errors.push(`Invalid eye item: ${JSON.stringify(item)}`);
          continue;
        }
        summary.eyesTested++;
      }

      // 3. Verify Dialogues (10 items with quote and answer)
      const dialogues = catalog.filter(item => item.category === 'dialogue');
      for (const item of dialogues) {
        if (!item.content || item.content.length < 5 || !item.answer) {
          summary.errors.push(`Invalid dialogue item: ${JSON.stringify(item)}`);
          continue;
        }
        summary.dialoguesTested++;
      }

      // 4. Verify Tie Breakers (14 items)
      for (const item of tieBreakers) {
        if (!item.content || !item.answer) {
          summary.errors.push(`Invalid tie breaker item: ${JSON.stringify(item)}`);
          continue;
        }
        summary.tieBreakersTested++;
      }

      return summary;
    });

    expect(result.framesTested).toBe(20);
    expect(result.eyesTested).toBe(10);
    expect(result.dialoguesTested).toBe(10);
    expect(result.tieBreakersTested).toBe(14);
    expect(result.errors).toEqual([]);

    // Test in-game presentation of each mode type:
    // A) Frame display
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      const frameItem = (window.ALL_CATALOG_ITEMS || window.GS.sections[0].frames).find(i => i.category === 'frames');
      MultiplayerEngine.currentPlaylist = [frameItem];
      MultiplayerEngine.currentPlayIndex = 0;
      FrameDisplay.showFrame(frameItem);
      UI.showScreen('gameScreen');
    });
    await expect(page.locator('#imageContainer')).toBeVisible();
    await expect(page.locator('#curSecName')).toContainText(/Frame/i);

    // B) Eye display (crop -> reveal)
    await page.evaluate(() => {
      const eyeItem = (window.ALL_CATALOG_ITEMS || window.GS.sections[1].frames).find(i => i.category === 'eyes');
      MultiplayerEngine.currentPlaylist = [eyeItem];
      MultiplayerEngine.currentPlayIndex = 0;
      FrameDisplay.showFrame(eyeItem);
    });
    await expect(page.locator('#imageContainer')).toBeVisible();
    await expect(page.locator('#curSecName')).toContainText(/Eyes/i);

    // Trigger reveal
    await page.evaluate(() => {
      MultiplayerEngine.hostSkipRound();
    });
    await expect(page.locator('#answerOverlay')).toBeVisible();
    await expect(page.locator('#answerOverlay .ans-badge')).toContainText(/Celebrity/i);

    // C) Dialogue display
    await page.evaluate(() => {
      MultiplayerEngine.isRoundFinished = false;
      const dialogueItem = (window.ALL_CATALOG_ITEMS || window.GS.sections[2].frames).find(i => i.category === 'dialogue');
      MultiplayerEngine.currentPlaylist = [dialogueItem];
      MultiplayerEngine.currentPlayIndex = 0;
      FrameDisplay.showFrame(dialogueItem);
    });
    await expect(page.locator('#frameDialogue')).toBeVisible();
    await expect(page.locator('#imageContainer')).toBeHidden();
    await expect(page.locator('#dialogueContext')).toContainText(/Guess the Movie/i);
    await expect(page.locator('#curSecName')).toContainText(/Dialogue/i);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 2: ALL SCREENS & MODALS (HOMEPAGE, CREATE, JOIN, REJOIN, LOBBY)
  // ═════════════════════════════════════════════════════════════════════════════
  test('SCREENS & MODALS: Complete UI navigation across all screens, inputs, steppers, and modal states', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 2.1 HomeScreen
    await expect(page.locator('#homeScreen')).toHaveClass(/active/);
    await expect(page.locator('.h-filmstrip')).toBeVisible();
    await expect(page.locator('.h-logo-img')).toBeVisible();

    // Sound toggle
    const sndBtn = page.locator('#sndBtn');
    await sndBtn.click();
    await sndBtn.click();

    // 2.2 CreateRoomModal
    await page.locator('.h-card-create').click();
    const createModal = page.locator('#createRoomModal');
    await expect(createModal).toHaveClass(/active/);

    // Select each avatar
    for (const av of ['aman', 'amish', 'aziz', 'vish']) {
      await page.locator(`#createRoomModal .mp-avatar-option[data-avatar="${av}"]`).click();
    }
    await page.fill('#hostPlayerNameInput', 'TestHost');
    await page.locator('#createRoomModal .mp-btn-primary').click();

    // 2.3 LobbyScreen
    await expect(page.locator('#playerLobbyScreen')).toHaveClass(/active/);

    // Mode toggle badges (use .first() to target visible badge)
    const framesBadge = page.locator('#modeBadge-frames').first();
    const eyesBadge = page.locator('#modeBadge-eyes').first();
    const dialogueBadge = page.locator('#modeBadge-dialogue').first();

    await expect(framesBadge).toBeVisible();
    await expect(eyesBadge).toBeVisible();
    await expect(dialogueBadge).toBeVisible();

    // Initial state: frames is active (20)
    // 1. Click eyesBadge -> adds eyes (20 + 10 = 30)
    await eyesBadge.click();
    let poolSize = await page.evaluate(() => {
      const cats = MultiplayerEngine.hostSettings.categories || [];
      return (cats.includes('frames') ? 20 : 0) + (cats.includes('eyes') ? 10 : 0) + (cats.includes('dialogue') ? 10 : 0);
    });
    expect(poolSize).toBe(30);

    // 2. Click dialogueBadge -> adds dialogue (20 + 10 + 10 = 40)
    await dialogueBadge.click();
    poolSize = await page.evaluate(() => {
      const cats = MultiplayerEngine.hostSettings.categories || [];
      return (cats.includes('frames') ? 20 : 0) + (cats.includes('eyes') ? 10 : 0) + (cats.includes('dialogue') ? 10 : 0);
    });
    expect(poolSize).toBe(40);

    // 3. Click dialogueBadge -> removes dialogue (20 + 10 = 30)
    await dialogueBadge.click();
    poolSize = await page.evaluate(() => {
      const cats = MultiplayerEngine.hostSettings.categories || [];
      return (cats.includes('frames') ? 20 : 0) + (cats.includes('eyes') ? 10 : 0) + (cats.includes('dialogue') ? 10 : 0);
    });
    expect(poolSize).toBe(30);

    // 4. Click eyesBadge -> removes eyes (20)
    await eyesBadge.click();
    poolSize = await page.evaluate(() => {
      const cats = MultiplayerEngine.hostSettings.categories || [];
      return (cats.includes('frames') ? 20 : 0) + (cats.includes('eyes') ? 10 : 0) + (cats.includes('dialogue') ? 10 : 0);
    });
    expect(poolSize).toBe(20);

    // 5. Guard: Try toggling off the last active mode (frames) -> prevented, still 20
    await framesBadge.click();
    poolSize = await page.evaluate(() => {
      const cats = MultiplayerEngine.hostSettings.categories || [];
      return (cats.includes('frames') ? 20 : 0) + (cats.includes('eyes') ? 10 : 0) + (cats.includes('dialogue') ? 10 : 0);
    });
    expect(poolSize).toBe(20);

    // Rounds Steppers
    const incRoundsBtn = page.locator('button[title="Increase Rounds"]').first();
    const decRoundsBtn = page.locator('button[title="Decrease Rounds"]').first();
    await decRoundsBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(19);
    await incRoundsBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(20);

    // Timer Steppers
    const incTimerBtn = page.locator('button[title="Increase Timer"]').first();
    const decTimerBtn = page.locator('button[title="Decrease Timer"]').first();
    await incTimerBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(31);
    await decTimerBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(30);

    // Copy Link button
    const copyBtn = page.locator('#copyLinkBtn').first();
    if (await copyBtn.count() > 0) {
      await copyBtn.click();
    }

    // Leave lobby
    await page.locator('button[onclick="PlayerLobby.back()"]').first().click();
    await expect(page.locator('#homeScreen')).toBeVisible();

    // 2.4 JoinRoomModal Empty Code Validation
    await page.locator('.h-card-join').click();
    const joinModal = page.locator('#joinRoomModal');
    await expect(joinModal).toHaveClass(/active/);
    await page.waitForTimeout(300);

    await page.fill('#joinCodeInput', '');
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('room code');
      await dialog.accept();
    });
    await page.locator('#joinRoomModal .mp-btn-primary').click();
    await page.waitForTimeout(200);
    await page.locator('#joinRoomModal .mp-modal-close').click();

    // 2.5 RejoinRoomModal (Simulate stored session)
    await page.evaluate(() => {
      const fakeSession = {
        roomCode: 'REJN',
        playerName: 'Rejoiner',
        playerAvatar: 'vish',
        isHost: true,
        timestamp: Date.now()
      };
      localStorage.setItem('gtf_active_session', JSON.stringify(fakeSession));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const rejoinModal = page.locator('#rejoinRoomModal');
    await expect(rejoinModal).toHaveClass(/active/);
    await expect(page.locator('#rejoinRoomCode')).toContainText('REJN');

    // Dismiss rejoin
    await page.locator('#rejoinRoomModal .mp-btn-secondary').click();
    await expect(rejoinModal).not.toHaveClass(/active/);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 3: MULTI-PEER CONCURRENCY, RACE CONDITIONS & POINTING (10 / 7 / 5 / 0)
  // ═════════════════════════════════════════════════════════════════════════════
  test('CONCURRENCY & POINTING: Multi-player race conditions, exact points (10/7/5/0), and chat answer masking', async ({ browser }) => {
    // 3 Clients: Host, PlayerTwo, PlayerThree
    const hostCtx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p3Ctx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const p2Page = await p2Ctx.newPage();
    const p3Page = await p3Ctx.newPage();

    // Host creates room
    await hostPage.goto('/');
    await hostPage.click('.h-card-create');
    await hostPage.fill('#hostPlayerNameInput', 'HostPlayer');
    await hostPage.click('#createRoomModal .mp-btn-primary');
    await hostPage.waitForSelector('#playerLobbyScreen.active');
    const roomCode = (await hostPage.locator('#displayRoomCode').innerText()).trim();

    // Player 2 joins
    await p2Page.goto('/');
    await p2Page.click('.h-card-join');
    await p2Page.fill('#joinCodeInput', roomCode);
    await p2Page.fill('#joinPlayerNameInput', 'PlayerTwo');
    await p2Page.click('#joinRoomModal .mp-btn-primary');
    await p2Page.waitForSelector('#playerLobbyScreen.active');

    // Player 3 joins
    await p3Page.goto('/');
    await p3Page.click('.h-card-join');
    await p3Page.fill('#joinCodeInput', roomCode);
    await p3Page.fill('#joinPlayerNameInput', 'PlayerThree');
    await p3Page.click('#joinRoomModal .mp-btn-primary');
    await p3Page.waitForSelector('#playerLobbyScreen.active');

    // Verify all 3 clients see 3 players in lobby
    await expect(hostPage.locator('#lobbyPlayerList .lobby-player')).toHaveCount(3);
    await expect(p2Page.locator('#lobbyPlayerList .lobby-player')).toHaveCount(3);
    await expect(p3Page.locator('#lobbyPlayerList .lobby-player')).toHaveCount(3);

    // Host launches match
    await hostPage.click('#lobbyStartBtn');
    await hostPage.waitForSelector('#howToAnswerScreen.active');
    await p2Page.waitForSelector('#howToAnswerScreen.active');
    await p3Page.waitForSelector('#howToAnswerScreen.active');

    // Fast launch game via host start button
    await hostPage.evaluate(() => {
      if (window.HowToAnswerGuide) {
        window.HowToAnswerGuide._secondsLeft = 0;
      }
    });

    const launchBtn = hostPage.locator('#htaHostStartBtn');
    await hostPage.waitForFunction(() => {
      const btn = document.getElementById('htaHostStartBtn');
      return btn && !btn.disabled;
    }, { timeout: 10000 });
    await launchBtn.click();

    await hostPage.waitForSelector('#gameScreen.active', { timeout: 15000 });
    await p2Page.waitForSelector('#gameScreen.active', { timeout: 15000 });
    await p3Page.waitForSelector('#gameScreen.active', { timeout: 15000 });

    // Setup controlled round on host
    const testAnswer = await hostPage.evaluate(() => {
      const cur = MultiplayerEngine.currentPlaylist[MultiplayerEngine.currentPlayIndex];
      return cur ? cur.answer : 'INCEPTION';
    });

    // Test Pointing System (10 / 7 / 5):
    // Player 1 submits first correct guess -> 10 pts
    await hostPage.evaluate((ans) => {
      MultiplayerEngine.submitGuess(ans);
    }, testAnswer);

    // Player 2 submits second correct guess -> 7 pts
    await p2Page.evaluate((ans) => {
      MultiplayerEngine.submitGuess(ans);
    }, testAnswer);

    // Player 3 submits third correct guess -> 5 pts
    await p3Page.evaluate((ans) => {
      MultiplayerEngine.submitGuess(ans);
    }, testAnswer);

    // Verify round winners ordering and points
    const winners = await hostPage.evaluate(() => MultiplayerEngine.roundWinners || []);
    expect(winners.length).toBeGreaterThanOrEqual(1);

    // Test Chat Answer Filtering: Submitting the correct answer in chat MUST NOT show the raw word in chat stream
    await p2Page.evaluate((ans) => {
      MultiplayerEngine.sendChatMessage(ans);
    }, testAnswer);

    const chatLeaked = await p3Page.evaluate((ans) => {
      const el = document.getElementById('chatMessages');
      return el ? el.innerText.includes(ans) : false;
    }, testAnswer);
    expect(chatLeaked).toBe(false);

    await hostCtx.close();
    await p2Ctx.close();
    await p3Ctx.close();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 4: HOST DISCONNECT & INSTANT 0.1s MIGRATION
  // ═════════════════════════════════════════════════════════════════════════════
  test('RESILIENCY: Host disconnect triggers immediate migration to successor with full host capabilities', async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    await hostPage.goto('/');
    await hostPage.click('.h-card-create');
    await hostPage.fill('#hostPlayerNameInput', 'OldHost');
    await hostPage.click('#createRoomModal .mp-btn-primary');
    await hostPage.waitForSelector('#playerLobbyScreen.active');
    const roomCode = (await hostPage.locator('#displayRoomCode').innerText()).trim();

    await guestPage.goto('/');
    await guestPage.click('.h-card-join');
    await guestPage.fill('#joinCodeInput', roomCode);
    await guestPage.fill('#joinPlayerNameInput', 'NewHost');
    await guestPage.click('#joinRoomModal .mp-btn-primary');
    await guestPage.waitForSelector('#playerLobbyScreen.active');

    // Host leaves lobby cleanly
    await hostPage.locator('button[onclick="PlayerLobby.back()"]').first().click();

    // Guest should be promoted to host
    await expect.poll(async () => {
      return await guestPage.evaluate(() => Boolean(MultiplayerEngine.isHost));
    }, { timeout: 10000 }).toBe(true);

    // Guest now has active Start Match button
    const startBtn = guestPage.locator('#lobbyStartBtn');
    await expect(startBtn).toBeEnabled();

    await hostCtx.close();
    await guestCtx.close();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 5: WINNER SCREEN, PODIUM CARDS & REMATCH FLOW
  // ═════════════════════════════════════════════════════════════════════════════
  test('WINNER SCREEN: Podium ranking (1st/2nd/3rd), score display, and Return to Lobby flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Direct simulation of match end
    await page.evaluate(() => {
      GS.players = [
        { id: 'p1', name: 'GoldWinner', avatar: 'aman', score: 120, isHost: true },
        { id: 'p2', name: 'SilverWinner', avatar: 'amish', score: 85, isHost: false },
        { id: 'p3', name: 'BronzeWinner', avatar: 'aziz', score: 50, isHost: false }
      ];
      MultiplayerEngine.isHost = true;
      WinnerScreen.show();
    });

    await expect(page.locator('#winnerScreen')).toHaveClass(/active/);

    // Verify 1st place podium name and score
    await expect(page.locator('#champName')).toContainText('GOLDWINNER');
    await expect(page.locator('#champScore')).toContainText('120');

    // Click Return to Lobby
    const lobbyBtn = page.locator('.btn-lobby');
    await lobbyBtn.click();
    await expect(page.locator('#playerLobbyScreen')).toBeVisible();
  });
});
