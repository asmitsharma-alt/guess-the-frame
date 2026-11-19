import { test, expect } from '@playwright/test';

test.describe('Section 2: Guess the Plot & Hint System', () => {
  test('Section 2 contains the 10 exact new plots', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const plots = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      return s2 ? s2.frames : [];
    });

    expect(plots.length).toBe(10);

    // Verify key plots and answers
    expect(plots[0].plot).toContain('engineering roommate');
    expect(plots[0].answer).toBe('3 IDIOTS');
    expect(plots[0].year).toBe('2009');

    expect(plots[1].plot).toContain('dream-architecture');
    expect(plots[1].answer).toBe('INCEPTION');
    expect(plots[1].year).toBe('2010');

    expect(plots[2].plot).toContain('ancient demon goddess');
    expect(plots[2].answer).toBe('TUMBBAD');
    expect(plots[2].year).toBe('2018');

    expect(plots[3].plot).toContain('wormhole near Saturn');
    expect(plots[3].answer).toBe('INTERSTELLAR');
    expect(plots[3].year).toBe('2014');

    expect(plots[4].plot).toContain('Inspector General');
    expect(plots[4].answer).toBe('DRISHYAM');
    expect(plots[4].year).toBe('2015');

    expect(plots[5].plot).toContain('simulated dream-world');
    expect(plots[5].answer).toBe('THE MATRIX');
    expect(plots[5].year).toBe('1999');

    expect(plots[6].plot).toContain('coal-mining family');
    expect(plots[6].answer).toBe('GANGS OF WASSEYPUR');
    expect(plots[6].year).toBe('2012');

    expect(plots[7].plot).toContain('bare-knuckle fighting club');
    expect(plots[7].answer).toBe('FIGHT CLUB');
    expect(plots[7].displayAnswer).toBe('***** ****');
    expect(plots[7].year).toBe('1999');

    expect(plots[8].plot).toContain('cricket');
    expect(plots[8].answer).toBe('LAGAAN');
    expect(plots[8].year).toBe('2001');

    expect(plots[9].plot).toContain('teleportation illusions');
    expect(plots[9].answer).toBe('THE PRESTIGE');
    expect(plots[9].year).toBe('2006');
  });

  test('Requesting hint on a plot round generates masked hint and deducts 4 points', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      const testPlotFrame = s2.frames[9]; // The Shawshank Redemption

      GS.players = [{ id: 'p1', name: 'Tester', score: 10, avatar: 'aman' }];
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Tester';
      MultiplayerEngine.currentPlaylist = [{ ...testPlotFrame, sectionName: 'Guess the Plot', sectionId: 2 }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentMaskedHint = null;
      MultiplayerEngine.hasUsedHintThisRound = false;

      // Trigger hint
      MultiplayerEngine.requestHint();

      return {
        scoreAfter: GS.players[0].score,
        maskedHint: MultiplayerEngine.currentMaskedHint
      };
    });

    // Verify points deducted
    expect(result.scoreAfter).toBe(6);
    expect(result.maskedHint).toBeTruthy();
    expect(result.maskedHint).toContain('-');
  });
});
