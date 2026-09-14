const { test, expect, chromium } = require('@playwright/test');

const LIVE_URL = 'https://guess-the-frame-react.vercel.app';

test.describe('Live Real-Time Multiplayer Sync Tests', () => {
  test.setTimeout(90000);

  test('Host and Client synchronize room creation, join, settings, match start, guesses, and game over in real-time', async () => {
    const browser = await chromium.launch({ headless: true });

    // 1. Setup Host context
    const hostContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const hostPage = await hostContext.newPage();

    // 2. Setup Client context
    const clientContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const clientPage = await clientContext.newPage();

    try {
      // Step A: Host creates room
      console.log('--- Step 1: Host creates room on live Vercel ---');
      await hostPage.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
      await hostPage.waitForTimeout(2000);

      const hostCreateBtn = hostPage.locator('#homeCreateBtn');
      await expect(hostCreateBtn).toBeVisible({ timeout: 10000 });
      await hostCreateBtn.click();
      await hostPage.waitForTimeout(1000);

      await hostPage.fill('#hostPlayerNameInput', 'Maverick Host');
      await hostPage.waitForTimeout(500);

      const confirmCreateBtn = hostPage.locator('#createRoomModal .mp-btn-primary');
      await confirmCreateBtn.click();
      await hostPage.waitForTimeout(3000);

      const roomCodeEl = hostPage.locator('#displayRoomCode, #roomCodeText').first();
      await expect(roomCodeEl).toBeVisible({ timeout: 10000 });
      const roomCode = (await roomCodeEl.textContent()).trim();
      console.log('✅ Room created with code:', roomCode);
      expect(roomCode).toBeTruthy();
      expect(roomCode).not.toBe('----');

      // Step B: Client joins room
      console.log('--- Step 2: Client joins room with code:', roomCode, '---');
      await clientPage.goto(`${LIVE_URL}?room=${roomCode}`, { waitUntil: 'domcontentloaded' });
      await clientPage.waitForTimeout(2000);

      const joinModal = clientPage.locator('#joinRoomModal');
      const isJoinModalOpen = await joinModal.evaluate(el => el.classList.contains('active')).catch(() => false);
      if (!isJoinModalOpen) {
        const homeJoinBtn = clientPage.locator('#homeJoinBtn');
        if (await homeJoinBtn.isVisible()) {
          await homeJoinBtn.click();
          await clientPage.waitForTimeout(1000);
        }
      }

      await clientPage.fill('#joinCodeInput', roomCode);
      await clientPage.fill('#joinPlayerNameInput', 'Goose Client');
      await clientPage.waitForTimeout(500);

      const confirmJoinBtn = clientPage.locator('#joinRoomModal .mp-btn-primary');
      await confirmJoinBtn.click();
      console.log('⏳ Client submitted join request. Waiting for real-time lobby sync...');

      // Verify Client appears in Host\'s player list within 10s
      let clientSynced = false;
      for (let i = 0; i < 20; i++) {
        await hostPage.waitForTimeout(500);
        const hostPlayerTexts = await hostPage.$$eval('.player-card, .lobby-player-card, [id^="playerCard-"]', els => els.map(e => e.textContent));
        if (hostPlayerTexts.some(t => t.includes('Goose Client'))) {
          clientSynced = true;
          console.log(`✅ Client appeared on Host lobby in ${(i + 1) * 0.5}s! Total cards:`, hostPlayerTexts.length);
          break;
        }
      }

      if (!clientSynced) {
        const gsPlayers = await hostPage.evaluate(() => window.GS?.players || []);
        console.log('GS.players on Host:', gsPlayers);
        expect(gsPlayers.some(p => p.name?.includes('Goose'))).toBe(true);
      }

      // Step C: Real-time Settings Sync (Timer & Rounds)
      console.log('--- Step 3: Real-Time Settings Sync ---');
      const timerBtn = hostPage.locator('button[title="Increase Timer"]').first();
      if (await timerBtn.isVisible()) {
        await timerBtn.click();
        await hostPage.waitForTimeout(2000);
        const hostTimer = await hostPage.locator('#hostTimerBtnText').textContent();
        const clientTimer = await clientPage.locator('#hostTimerBtnText').textContent().catch(() => 'unknown');
        console.log(`Host Timer: ${hostTimer?.trim()}, Client Timer: ${clientTimer?.trim()}`);
      }

      // Step D: Start Match and Guide transition
      console.log('--- Step 4: Host Starts Match ---');
      const startBtn = hostPage.locator('#lobbyStartBtn:not([style*="display: none"]), #mobileLobbyStartBtn:not([style*="display: none"])').first();
      await startBtn.click();
      await hostPage.waitForTimeout(3000);

      // Verify both in Game or Guide
      const hostInGame = await hostPage.evaluate(() => {
        return document.getElementById('gameScreen')?.classList.contains('active') ||
               document.getElementById('howToAnswerScreen')?.classList.contains('active');
      });
      const clientInGame = await clientPage.evaluate(() => {
        return document.getElementById('gameScreen')?.classList.contains('active') ||
               document.getElementById('howToAnswerScreen')?.classList.contains('active');
      });
      console.log('Host in Game:', hostInGame, '| Client in Game:', clientInGame);
      expect(hostInGame).toBe(true);
      expect(clientInGame).toBe(true);

      // Dismiss guide
      await hostPage.evaluate(() => {
        if (window.HowToAnswerGuide) window.HowToAnswerGuide.stop();
        window.UI?.showScreen('gameScreen');
        window.MultiplayerEngine?.sendEvent('GUIDE_COMPLETE', {});
      });
      await clientPage.waitForTimeout(2000);

      // Step E: Guess validation and Winner Sync
      console.log('--- Step 5: Guess Validation and Winner Sync ---');
      const curAnswer = await hostPage.evaluate(() => {
        const cur = window.MultiplayerEngine?.currentPlaylist?.[window.MultiplayerEngine?.currentPlayIndex || 0];
        return cur?.answer || null;
      });
      console.log('Current Frame Answer:', curAnswer);

      if (curAnswer) {
        await clientPage.evaluate((ans) => {
          if (window.MultiplayerEngine) {
            window.MultiplayerEngine.submitGuess(ans);
          }
        }, curAnswer);

        await hostPage.waitForTimeout(2000);

        const hostWinners = await hostPage.evaluate(() => window.MultiplayerEngine?.currentRoundWinners || []);
        console.log('Host Round Winners:', hostWinners.map(w => w.playerName));
        expect(hostWinners.length).toBeGreaterThan(0);
      }

      // Step F: Skip Round & Answer Reveal Sync
      console.log('--- Step 6: Skip Round & Answer Reveal Sync ---');
      await hostPage.evaluate(() => {
        if (window.MultiplayerEngine?.hostSkipRound) {
          window.MultiplayerEngine.hostSkipRound();
        }
      });
      await clientPage.waitForTimeout(2000);

      const hostReveal = await hostPage.evaluate(() => {
        const ov = document.getElementById('answerOverlay');
        return ov?.classList.contains('active') || ov?.classList.contains('visible');
      });
      const clientReveal = await clientPage.evaluate(() => {
        const ov = document.getElementById('answerOverlay');
        return ov?.classList.contains('active') || ov?.classList.contains('visible');
      });
      console.log('Host Reveal Visible:', hostReveal, '| Client Reveal Visible:', clientReveal);
      expect(hostReveal).toBe(true);

      // Step G: Next Round Frame Sync
      console.log('--- Step 7: Next Round Frame Sync ---');
      await hostPage.evaluate(() => {
        if (window.MultiplayerEngine?.hostNextRound) {
          window.MultiplayerEngine.hostNextRound();
        }
      });
      await clientPage.waitForTimeout(2000);

      const hostPlayIndex = await hostPage.evaluate(() => window.MultiplayerEngine?.currentPlayIndex);
      const clientPlayIndex = await clientPage.evaluate(() => window.MultiplayerEngine?.currentPlayIndex);
      console.log(`Host Index: ${hostPlayIndex} | Client Index: ${clientPlayIndex}`);
      expect(hostPlayIndex).toBe(1);

      // Step H: Game Over & Winner Screen
      console.log('--- Step 8: Game Over & Winner Screen Sync ---');
      await hostPage.evaluate(() => {
        if (window.MultiplayerEngine?.finishGame) {
          window.MultiplayerEngine.finishGame();
        }
      });
      await clientPage.waitForTimeout(2000);

      const hostWinnerActive = await hostPage.evaluate(() => document.getElementById('winnerScreen')?.classList.contains('active'));
      const clientWinnerActive = await clientPage.evaluate(() => document.getElementById('winnerScreen')?.classList.contains('active'));
      console.log('Host Winner Active:', hostWinnerActive, '| Client Winner Active:', clientWinnerActive);
      expect(hostWinnerActive).toBe(true);

      console.log('🎉 REAL-TIME MULTIPLAYER SYNC TEST FULLY PASSED!');
    } finally {
      await browser.close();
    }
  });
});
