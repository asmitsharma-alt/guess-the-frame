import { test, expect } from '@playwright/test';

test.describe('Cinema Paradiso & Stop-Word Title Guessing and Chat Transmission Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('FuzzyMatcher matches "cinema", "ciname", "parido", "paridoo", "ciname parido" for CINEMA PARADISO', async ({ page }) => {
    const results = await page.evaluate(() => {
      const ans = 'CINEMA PARADISO';
      return {
        cinema: FuzzyMatcher.isMatch('cinema', ans),
        ciname: FuzzyMatcher.isMatch('ciname', ans),
        parido: FuzzyMatcher.isMatch('parido', ans),
        paridoo: FuzzyMatcher.isMatch('paridoo', ans),
        cinameParido: FuzzyMatcher.isMatch('ciname parido', ans),
        cinameParidoo: FuzzyMatcher.isMatch('ciname paridoo', ans),
        full: FuzzyMatcher.isMatch('cinema paradiso', ans),
        unrelated: FuzzyMatcher.isMatch('what movie is this', ans)
      };
    });

    expect(results.cinema).toBe(true);
    expect(results.ciname).toBe(true);
    expect(results.parido).toBe(true);
    expect(results.paridoo).toBe(true);
    expect(results.cinameParido).toBe(true);
    expect(results.cinameParidoo).toBe(true);
    expect(results.full).toBe(true);
    expect(results.unrelated).toBe(false);
  });

  test('FuzzyMatcher matches title words in other films with common words (Eyes Wide Shut, Beckham)', async ({ page }) => {
    const results = await page.evaluate(() => {
      return {
        eyes: FuzzyMatcher.isMatch('eyes', 'EYES WIDE SHUT'),
        wide: FuzzyMatcher.isMatch('wide', 'EYES WIDE SHUT'),
        shut: FuzzyMatcher.isMatch('shut', 'EYES WIDE SHUT'),
        beckham: FuzzyMatcher.isMatch('beckham', 'BEND IT LIKE BECKHAM'),
        bend: FuzzyMatcher.isMatch('bend', 'BEND IT LIKE BECKHAM')
      };
    });

    expect(results.eyes).toBe(true);
    expect(results.wide).toBe(true);
    expect(results.shut).toBe(true);
    expect(results.beckham).toBe(true);
    expect(results.bend).toBe(true);
  });

  test('Typing "cinema" during Cinema Paradiso round correctly scores points via guess validation', async ({ page }) => {
    const outcome = await page.evaluate(() => {
      UI.showScreen('gameScreen');

      // Setup mock round for Cinema Paradiso
      GS.players = [{ id: 'p_test', name: 'MovieBuff', score: 0, avatar: 'ayank' }];
      MultiplayerEngine.playerId = 'p_test';
      MultiplayerEngine.playerName = 'MovieBuff';
      MultiplayerEngine.playerAvatar = 'ayank';
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentPlaylist = [{ answer: 'CINEMA PARADISO', type: 'image', content: 'GUESSTHEFRAME/Cinema Paradiso (1988).webp' }];
      MultiplayerEngine.currentRoundWinners = [];
      MultiplayerEngine._roundGuessedCorrectIds = new Set();

      // Submit "cinema" via ChatEngine
      ChatEngine.processOutgoingMessage('cinema');

      return {
        scoreAfter: GS.players[0].score,
        winnerCount: (MultiplayerEngine.currentRoundWinners || []).length,
        hasWinner: (MultiplayerEngine.currentRoundWinners || []).some(w => w.playerId === 'p_test')
      };
    });

    expect(outcome.scoreAfter).toBe(10);
    expect(outcome.winnerCount).toBe(1);
    expect(outcome.hasWinner).toBe(true);
  });

  test('Non-matching chat or wrong guess during round is never swallowed and displays in chat', async ({ page }) => {
    await page.evaluate(() => {
      UI.showScreen('gameScreen');

      GS.players = [{ id: 'p_test', name: 'Chatter', score: 0, avatar: 'ayank' }];
      MultiplayerEngine.playerId = 'p_test';
      MultiplayerEngine.playerName = 'Chatter';
      MultiplayerEngine.playerAvatar = 'ayank';
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentPlaylist = [{ answer: 'CINEMA PARADISO', type: 'image', content: 'GUESSTHEFRAME/Cinema Paradiso (1988).webp' }];
      MultiplayerEngine.currentRoundWinners = [];
      MultiplayerEngine._roundGuessedCorrectIds = new Set();

      // Send a casual chat message
      ChatEngine.processOutgoingMessage('hello everyone i think this is cool');
    });

    const stream = page.locator('#liveChatStream');
    await expect(stream).toContainText('hello everyone i think this is cool');
  });
});
