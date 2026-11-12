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
    expect(plots[0].plot).toContain('Bhiku Mhatre');
    expect(plots[0].answer).toBe('SATYA');
    expect(plots[0].year).toBe('1998');

    expect(plots[1].plot).toContain('wrestler');
    expect(plots[1].answer).toBe('DANGAL');
    expect(plots[1].year).toBe('2016');

    expect(plots[2].plot).toContain('NASA');
    expect(plots[2].answer).toBe('SWADES');
    expect(plots[2].year).toBe('2004');

    expect(plots[3].plot).toContain('1920s');
    expect(plots[3].answer).toBe('RRR');
    expect(plots[3].year).toBe('2022');

    expect(plots[4].plot).toContain('Kodaikanal');
    expect(plots[4].answer).toBe('MANJUMMEL BOYS');
    expect(plots[4].year).toBe('2024');

    expect(plots[5].plot).toContain('Rio Grande');
    expect(plots[5].answer).toBe('NO COUNTRY FOR OLD MEN');
    expect(plots[5].year).toBe('2007');

    expect(plots[6].plot).toContain('Seven Deadly Sins');
    expect(plots[6].answer).toBe('SE7EN');
    expect(plots[6].year).toBe('1995');

    expect(plots[7].plot).toContain('cloned prehistoric creatures');
    expect(plots[7].answer).toBe('JURASSIC PARK');
    expect(plots[7].year).toBe('1993');

    expect(plots[8].plot).toContain('South Boston');
    expect(plots[8].answer).toBe('THE DEPARTED');
    expect(plots[8].year).toBe('2006');

    expect(plots[9].plot).toContain('plutonium-powered sports car');
    expect(plots[9].answer).toBe('BACK TO THE FUTURE');
    expect(plots[9].year).toBe('1985');
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
