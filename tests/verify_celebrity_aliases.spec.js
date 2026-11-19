const { test, expect } = require('@playwright/test');

test('Verify character roles (Batman, Spiderman) are rejected and only real actor names are accepted', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const validationResults = await page.evaluate(() => {
    // Get Section 3 (Guess the Eye)
    const section3 = GS.sections.find(s => s.id === 3 || s.name === 'Guess the Eye');
    if (!section3) return { error: 'Section 3 not found' };

    const tomFrame = section3.frames.find(f => f.answer === 'TOM HANKS');
    const sandraFrame = section3.frames.find(f => f.answer === 'SANDRA BULLOCK');

    const checkMatch = (guess, frame) => {
      const matchPrimary = FuzzyMatcher.isMatch(guess, frame.answer);
      const matchAlias = Array.isArray(frame.aliases) && frame.aliases.some(a => FuzzyMatcher.isMatch(guess, a));
      return matchPrimary || matchAlias;
    };

    return {
      tomAliases: tomFrame.aliases,
      sandraAliases: sandraFrame.aliases,
      tom_forrest_matches: checkMatch('forrest gump', tomFrame),
      tom_woody_matches: checkMatch('woody', tomFrame),
      tom_real_name_matches: checkMatch('tom hanks', tomFrame),
      tom_surname_matches: checkMatch('hanks', tomFrame),
      sandra_character_matches: checkMatch('miss congeniality', sandraFrame),
      sandra_real_name_matches: checkMatch('sandra bullock', sandraFrame),
      sandra_surname_matches: checkMatch('bullock', sandraFrame)
    };
  });

  console.log('VALIDATION RESULTS:', JSON.stringify(validationResults, null, 2));

  expect(validationResults.tomAliases).not.toContain('FORREST GUMP');
  expect(validationResults.tomAliases).not.toContain('WOODY');
  expect(validationResults.tom_forrest_matches).toBe(false);
  expect(validationResults.tom_woody_matches).toBe(false);
  expect(validationResults.tom_real_name_matches).toBe(true);
  expect(validationResults.tom_surname_matches).toBe(true);

  expect(validationResults.sandraAliases).not.toContain('MISS CONGENIALITY');
  expect(validationResults.sandra_character_matches).toBe(false);
  expect(validationResults.sandra_real_name_matches).toBe(true);
  expect(validationResults.sandra_surname_matches).toBe(true);
});
