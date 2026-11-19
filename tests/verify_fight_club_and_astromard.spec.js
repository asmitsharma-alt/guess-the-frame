import { test, expect } from '@playwright/test';

test.describe('Special Rules: Fight Club mask and Astromard alias', () => {
  test('Fight Club: accepts "fight club" and "fight clucb", displays "***** ****" on reveal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      const s2 = GS.sections.find(s => s.id === 2);
      const fcFrame = s2.frames.find(f => f.answer === 'FIGHT CLUB');

      GS.players = [{ id: 'p1', name: 'Tester', score: 0, avatar: 'aman' }];
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Tester';
      MultiplayerEngine.currentPlaylist = [{ ...fcFrame, sectionName: 'Guess the Plot', sectionId: 2 }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];
      MultiplayerEngine._roundGuessedCorrectIds = new Set();

      // Test 1: Guess "FIGHT CLUB" matches
      const match1 = FuzzyMatcher.isMatch('fight club', fcFrame.answer) ||
        (Array.isArray(fcFrame.aliases) && fcFrame.aliases.some(a => FuzzyMatcher.isMatch('fight club', a)));

      // Test 2: Guess "fight clucb" matches
      const match2 = FuzzyMatcher.isMatch('fight clucb', fcFrame.answer) ||
        (Array.isArray(fcFrame.aliases) && fcFrame.aliases.some(a => FuzzyMatcher.isMatch('fight clucb', a)));

      // Process guess
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Tester', playerAvatar: 'aman', guess: 'fight clucb', roundIndex: 0 });
      const scoreAfter = GS.players[0].score;

      // Reveal answer
      MultiplayerEngine.endRound();
      const ansTitle = document.getElementById('ansTitle');

      return {
        match1,
        match2,
        scoreAfter,
        revealedTitle: ansTitle ? ansTitle.textContent : ''
      };
    });

    expect(result.match1).toBe(true);
    expect(result.match2).toBe(true);
    expect(result.scoreAfter).toBe(10);
    expect(result.revealedTitle).toBe('***** ****');
  });

  test('Astromard: accepts "amish", displays "Astromard" on reveal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      const s3 = GS.sections.find(s => s.id === 3);
      const astroFrame = s3.frames.find(f => f.answer === 'ASTROMARD');

      GS.players = [{ id: 'p1', name: 'Tester', score: 0, avatar: 'aman' }];
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Tester';
      MultiplayerEngine.currentPlaylist = [{ ...astroFrame, sectionName: 'Guess the Eye', sectionId: 3 }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];
      MultiplayerEngine._roundGuessedCorrectIds = new Set();

      // Test guess "amish"
      const matchAmish = FuzzyMatcher.isMatch('amish', astroFrame.answer) ||
        (Array.isArray(astroFrame.aliases) && astroFrame.aliases.some(a => FuzzyMatcher.isMatch('amish', a)));

      // Process guess
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Tester', playerAvatar: 'aman', guess: 'amish', roundIndex: 0 });
      const scoreAfter = GS.players[0].score;

      // Reveal answer
      MultiplayerEngine.endRound();
      const ansTitle = document.getElementById('ansTitle');

      return {
        matchAmish,
        scoreAfter,
        revealedTitle: ansTitle ? ansTitle.textContent : ''
      };
    });

    expect(result.matchAmish).toBe(true);
    expect(result.scoreAfter).toBe(10);
    expect(result.revealedTitle).toBe('Astromard');
  });
});
