const { test, expect } = require('@playwright/test');

test('Verify character roles (Batman, Spiderman) are rejected and only real actor names are accepted', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const validationResults = await page.evaluate(() => {
    // Get Section 3 (Guess the Eye)
    const section3 = GS.sections.find(s => s.id === 3 || s.name === 'Guess the Eye');
    if (!section3) return { error: 'Section 3 not found' };

    const benFrame = section3.frames.find(f => f.answer === 'BEN AFFLECK');
    const andrewFrame = section3.frames.find(f => f.answer === 'ANDREW GARFIELD');

    const checkMatch = (guess, frame) => {
      const matchPrimary = FuzzyMatcher.isMatch(guess, frame.answer);
      const matchAlias = Array.isArray(frame.aliases) && frame.aliases.some(a => FuzzyMatcher.isMatch(guess, a));
      return matchPrimary || matchAlias;
    };

    return {
      benAliases: benFrame.aliases,
      andrewAliases: andrewFrame.aliases,
      ben_batman_matches: checkMatch('batman', benFrame),
      ben_real_name_matches: checkMatch('ben affleck', benFrame),
      ben_surname_matches: checkMatch('affleck', benFrame),
      andrew_spiderman_matches: checkMatch('spiderman', andrewFrame),
      andrew_real_name_matches: checkMatch('andrew garfield', andrewFrame),
      andrew_surname_matches: checkMatch('garfield', andrewFrame)
    };
  });

  console.log('VALIDATION RESULTS:', JSON.stringify(validationResults, null, 2));

  expect(validationResults.benAliases).not.toContain('BATMAN');
  expect(validationResults.ben_batman_matches).toBe(false);
  expect(validationResults.ben_real_name_matches).toBe(true);
  expect(validationResults.ben_surname_matches).toBe(true);

  expect(validationResults.andrewAliases).not.toContain('SPIDERMAN');
  expect(validationResults.andrew_spiderman_matches).toBe(false);
  expect(validationResults.andrew_real_name_matches).toBe(true);
  expect(validationResults.andrew_surname_matches).toBe(true);
});
