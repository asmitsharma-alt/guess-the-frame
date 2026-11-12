import { test, expect } from '@playwright/test';

test.describe('Fully Manual Next Round Button (No Auto-advance Countdown Timer)', () => {
  test('Host Next Round button has no timer countdown and never auto-advances', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      document.body.classList.add('bypass-restrict');
      UI.showScreen('gameScreen');

      MultiplayerEngine.isHost = true;
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentPlaylist = [
        { id: 1, answer: 'MOVIE ONE', type: 'frame' },
        { id: 2, answer: 'MOVIE TWO', type: 'frame' }
      ];

      MultiplayerEngine.endRound();

      const btn = document.getElementById('ansNextRoundBtn');
      const waitPill = document.getElementById('ansWaitingHostPill');

      const initialText = btn ? btn.textContent.trim() : '';
      const timerInstance = MultiplayerEngine._hostAutoAdvanceTimer;

      // Wait 1.5 seconds to ensure no background timer modifies the text
      await new Promise(r => setTimeout(r, 1500));
      const afterWaitText = btn ? btn.textContent.trim() : '';

      return {
        btnDisplay: btn ? btn.style.display : null,
        initialText,
        afterWaitText,
        hasNoTimerInText: !/\(\d+s\)/.test(initialText) && !/\(\d+s\)/.test(afterWaitText),
        timerIsNull: timerInstance === null || timerInstance === undefined,
        waitPillHidden: waitPill ? waitPill.style.display === 'none' : false,
        isRoundFinished: MultiplayerEngine.isRoundFinished
      };
    });

    console.log('Host Manual Button Result:', JSON.stringify(result, null, 2));
    expect(result.btnDisplay).toBe('inline-flex');
    expect(result.initialText).toBe('NEXT ROUND ⏭ [Enter]');
    expect(result.afterWaitText).toBe('NEXT ROUND ⏭ [Enter]');
    expect(result.hasNoTimerInText).toBe(true);
    expect(result.timerIsNull).toBe(true);
    expect(result.waitPillHidden).toBe(true);
  });

  test('Host Final Round button shows FINISH MATCH without countdown timer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      document.body.classList.add('bypass-restrict');
      UI.showScreen('gameScreen');

      MultiplayerEngine.isHost = true;
      MultiplayerEngine.currentPlayIndex = 1; // Last round
      MultiplayerEngine.currentPlaylist = [
        { id: 1, answer: 'MOVIE ONE', type: 'frame' },
        { id: 2, answer: 'MOVIE TWO', type: 'frame' }
      ];

      MultiplayerEngine.endRound();

      const btn = document.getElementById('ansNextRoundBtn');
      const initialText = btn ? btn.textContent.trim() : '';

      await new Promise(r => setTimeout(r, 1200));
      const afterWaitText = btn ? btn.textContent.trim() : '';

      return {
        initialText,
        afterWaitText,
        hasNoTimerInText: !/\(\d+s\)/.test(initialText) && !/\(\d+s\)/.test(afterWaitText)
      };
    });

    console.log('Host Final Round Result:', JSON.stringify(result, null, 2));
    expect(result.initialText).toBe('FINISH MATCH 🏁 [Enter]');
    expect(result.afterWaitText).toBe('FINISH MATCH 🏁 [Enter]');
    expect(result.hasNoTimerInText).toBe(true);
  });

  test('Remote player sees clean waiting indicator with no countdown ticker', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      document.body.classList.add('bypass-restrict');
      UI.showScreen('gameScreen');

      MultiplayerEngine.isHost = false;
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentPlaylist = [
        { id: 1, answer: 'MOVIE ONE', type: 'frame' },
        { id: 2, answer: 'MOVIE TWO', type: 'frame' }
      ];

      MultiplayerEngine.handleRemoteRoundFinish({
        currentRoundWinners: [],
        currentPlayIndex: 0,
        revealedAnswer: 'MOVIE ONE'
      });

      const btn = document.getElementById('ansNextRoundBtn');
      const waitPill = document.getElementById('ansWaitingHostPill');

      const initialPillText = waitPill ? waitPill.textContent.trim() : '';
      const timerInstance = MultiplayerEngine._clientWaitTimer;

      await new Promise(r => setTimeout(r, 1200));
      const afterWaitPillText = waitPill ? waitPill.textContent.trim() : '';

      return {
        btnHidden: btn ? btn.style.display === 'none' : true,
        pillVisible: waitPill ? waitPill.style.display === 'inline-flex' : false,
        initialPillText,
        afterWaitPillText,
        hasNoTimerInText: !/\(\d+s\)/.test(initialPillText) && !/\(\d+s\)/.test(afterWaitPillText),
        timerIsNull: timerInstance === null || timerInstance === undefined
      };
    });

    console.log('Remote Player Waiting Result:', JSON.stringify(result, null, 2));
    expect(result.btnHidden).toBe(true);
    expect(result.pillVisible).toBe(true);
    expect(result.initialPillText).toBe('⌛ Waiting for host to start next round...');
    expect(result.afterWaitPillText).toBe('⌛ Waiting for host to start next round...');
    expect(result.hasNoTimerInText).toBe(true);
    expect(result.timerIsNull).toBe(true);
  });
});
