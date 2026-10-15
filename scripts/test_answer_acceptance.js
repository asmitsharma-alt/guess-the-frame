/**
 * ANSWER ACCEPTANCE & SPOILER WARNING — COMPREHENSIVE TEST
 * ═══════════════════════════════════════════════════════════
 * Tests three core behaviors:
 *  1. FuzzyMatcher.isMatch — single word, typos, multi-word with extras
 *  2. Spoiler warning — ONLY for already-won players
 *  3. isAnswerOrSpoiler — broader detection (should NOT trigger for non-winners)
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///C:/Users/admin/Documents/projects/scoop main/scoopcast-live/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.body.classList.add('bypass-restrict'));

  let passed = 0, failed = 0;

  function assert(label, actual, expected) {
    if (actual === expected) {
      passed++;
      console.log(`  ✅ ${label}`);
    } else {
      failed++;
      console.log(`  ❌ ${label} — expected ${expected}, got ${actual}`);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  TEST GROUP 1: FuzzyMatcher.isMatch — Single Word Guesses
  // ════════════════════════════════════════════════════════════
  console.log('\n═══ GROUP 1: Single Word Guesses ═══');

  const matchTests = await page.evaluate(() => {
    const FM = FuzzyMatcher;
    return [
      // Exact single word from multi-word title
      { g: 'wasseypur', a: 'Gangs of Wasseypur', expected: true, label: '"wasseypur" → Gangs of Wasseypur' },
      { g: 'dangal', a: 'Dangal', expected: true, label: '"dangal" → Dangal' },
      { g: 'idiots', a: '3 Idiots', expected: true, label: '"idiots" → 3 Idiots' },
      { g: 'idiot', a: '3 Idiots', expected: true, label: '"idiot" (singular) → 3 Idiots' },
      { g: 'knight', a: 'The Dark Knight', expected: true, label: '"knight" → The Dark Knight' },
      { g: 'godfather', a: 'The Godfather', expected: true, label: '"godfather" → The Godfather' },

      // Single word with typos
      { g: 'waseypur', a: 'Gangs of Wasseypur', expected: true, label: '"waseypur" (typo) → Gangs of Wasseypur' },
      { g: 'danggal', a: 'Dangal', expected: true, label: '"danggal" (extra g) → Dangal' },
      { g: 'dangaal', a: 'Dangal', expected: true, label: '"dangaal" (extra a) → Dangal' },
      { g: '3 idots', a: '3 Idiots', expected: true, label: '"3 idots" (typo) → 3 Idiots' },
      { g: 'welcom', a: 'Welcome (2007)', expected: true, label: '"welcom" (truncated) → Welcome (2007)' },
      { g: 'kabhil', a: 'Kaabil', expected: true, label: '"kabhil" (typo) → Kaabil' },
      { g: 'krrish', a: 'Krrish', expected: true, label: '"krrish" → Krrish' },
      { g: 'krish', a: 'Krrish', expected: true, label: '"krish" (missing r) → Krrish' },

      // Random words that should NOT match
      { g: 'pizza', a: 'Gangs of Wasseypur', expected: false, label: '"pizza" ✗ Gangs of Wasseypur' },
      { g: 'hello', a: 'Dangal', expected: false, label: '"hello" ✗ Dangal' },
      { g: 'what is this', a: 'The Dark Knight', expected: false, label: '"what is this" ✗ The Dark Knight' },
      { g: 'lol', a: '3 Idiots', expected: false, label: '"lol" ✗ 3 Idiots' },
      { g: 'movie', a: 'Dev D', expected: false, label: '"movie" (stop word) ✗ Dev D' },
      { g: 'the', a: 'The Dark Knight', expected: false, label: '"the" (stop word) ✗ The Dark Knight' },
      { g: 'is', a: 'Dev D', expected: false, label: '"is" (stop word) ✗ Dev D' },
    ].map(t => ({ ...t, result: FM.isMatch(t.g, t.a) }));
  });

  for (const t of matchTests) {
    assert(t.label, t.result, t.expected);
  }

  // ════════════════════════════════════════════════════════════
  //  TEST GROUP 2: FuzzyMatcher.isMatch — Chat Messages with Extra Words
  // ════════════════════════════════════════════════════════════
  console.log('\n═══ GROUP 2: Chat Messages with Extra Words ═══');

  const chatMatchTests = await page.evaluate(() => {
    const FM = FuzzyMatcher;
    return [
      { g: 'is it dangal bro', a: 'Dangal', expected: true, label: '"is it dangal bro" → Dangal' },
      { g: 'dev d is awesome', a: 'Dev D', expected: true, label: '"dev d is awesome" → Dev D' },
      { g: 'i think its wasseypur', a: 'Gangs of Wasseypur', expected: true, label: '"i think its wasseypur" → Gangs of Wasseypur' },
      { g: 'welcome to the show', a: 'Welcome (2007)', expected: true, label: '"welcome to the show" → Welcome' },
      { g: 'hey is this dangal or what', a: 'Dangal', expected: true, label: '"hey is this dangal or what" → Dangal' },
      { g: 'maybe it is 3 idiots', a: '3 Idiots', expected: true, label: '"maybe it is 3 idiots" → 3 Idiots' },
      { g: 'godfather for sure', a: 'The Godfather', expected: true, label: '"godfather for sure" → The Godfather' },
      { g: 'dark knight rises', a: 'The Dark Knight', expected: true, label: '"dark knight rises" → The Dark Knight' },

      // Random chat that should NOT match
      { g: 'this game is so fun', a: 'Dangal', expected: false, label: '"this game is so fun" ✗ Dangal' },
      { g: 'what movie is this lol', a: '3 Idiots', expected: false, label: '"what movie is this lol" ✗ 3 Idiots' },
      { g: 'I have no idea bro', a: 'The Godfather', expected: false, label: '"I have no idea bro" ✗ The Godfather' },
    ].map(t => ({ ...t, result: FM.isMatch(t.g, t.a) }));
  });

  for (const t of chatMatchTests) {
    assert(t.label, t.result, t.expected);
  }

  // ════════════════════════════════════════════════════════════
  //  TEST GROUP 3: Full Title Match (still works)
  // ════════════════════════════════════════════════════════════
  console.log('\n═══ GROUP 3: Full Title Match ═══');

  const fullTitleTests = await page.evaluate(() => {
    const FM = FuzzyMatcher;
    return [
      { g: 'Gangs of Wasseypur', a: 'Gangs of Wasseypur', expected: true, label: 'exact full title' },
      { g: 'gangs of waseypur', a: 'Gangs of Wasseypur', expected: true, label: 'full title with typo' },
      { g: 'the dark knight', a: 'The Dark Knight', expected: true, label: 'exact with article' },
      { g: 'dark knight', a: 'The Dark Knight', expected: true, label: 'without article' },
      { g: '3 idiots', a: '3 Idiots', expected: true, label: 'number + word' },
      { g: 'three idiots', a: '3 Idiots', expected: true, label: 'word-number conversion' },
      { g: 'Dev D', a: 'Dev D', expected: true, label: 'short title exact' },
      { g: 'devd', a: 'Dev D', expected: true, label: 'compact short title' },
    ].map(t => ({ ...t, result: FM.isMatch(t.g, t.a) }));
  });

  for (const t of fullTitleTests) {
    assert(t.label, t.result, t.expected);
  }

  // ════════════════════════════════════════════════════════════
  //  TEST GROUP 4: Spoiler Warning Logic
  // ════════════════════════════════════════════════════════════
  console.log('\n═══ GROUP 4: Spoiler Warning Behavior ═══');

  const spoilerTests = await page.evaluate(() => {
    // Simulate the processOutgoingMessage decision logic
    const results = [];

    function simulateSpoilerDecision(text, answer, alreadyWon) {
      const isMatch = FuzzyMatcher.isMatch(text, answer);
      const isSpoiler = ChatEngine.isAnswerOrSpoiler(text, answer);

      if (isMatch) {
        if (!alreadyWon) return 'SUBMIT_GUESS';
        else return 'SPOILER_WARNING';
      }

      if (isSpoiler) {
        if (alreadyWon) return 'SPOILER_WARNING';
        else return 'SUBMIT_GUESS';  // New behavior: treat as guess, not warning
      }

      return 'REGULAR_CHAT';
    }

    // Non-winner typing answer word — should get SUBMIT_GUESS, NOT warning
    results.push({
      label: 'Non-winner types "wasseypur" → SUBMIT_GUESS',
      result: simulateSpoilerDecision('wasseypur', 'Gangs of Wasseypur', false),
      expected: 'SUBMIT_GUESS'
    });

    results.push({
      label: 'Non-winner types "dangal" → SUBMIT_GUESS',
      result: simulateSpoilerDecision('dangal', 'Dangal', false),
      expected: 'SUBMIT_GUESS'
    });

    results.push({
      label: 'Non-winner types "is it dangal" → SUBMIT_GUESS',
      result: simulateSpoilerDecision('is it dangal', 'Dangal', false),
      expected: 'SUBMIT_GUESS'
    });

    results.push({
      label: 'Non-winner types random chat → REGULAR_CHAT',
      result: simulateSpoilerDecision('this game is fun', 'Dangal', false),
      expected: 'REGULAR_CHAT'
    });

    // Already-won player typing answer word — SHOULD get warning
    results.push({
      label: 'Winner types "dangal" → SPOILER_WARNING',
      result: simulateSpoilerDecision('dangal', 'Dangal', true),
      expected: 'SPOILER_WARNING'
    });

    results.push({
      label: 'Winner types "wasseypur" → SPOILER_WARNING',
      result: simulateSpoilerDecision('wasseypur', 'Gangs of Wasseypur', true),
      expected: 'SPOILER_WARNING'
    });

    results.push({
      label: 'Winner types random chat → REGULAR_CHAT',
      result: simulateSpoilerDecision('good game everyone', 'Dangal', true),
      expected: 'REGULAR_CHAT'
    });

    return results;
  });

  for (const t of spoilerTests) {
    assert(t.label, t.result, t.expected);
  }

  // ════════════════════════════════════════════════════════════
  //  TEST GROUP 5: Edge Cases — Very Short Answers, Aliases
  // ════════════════════════════════════════════════════════════
  console.log('\n═══ GROUP 5: Edge Cases ═══');

  const edgeCaseTests = await page.evaluate(() => {
    const FM = FuzzyMatcher;
    return [
      // Short answers
      { g: 'Dev D', a: 'Dev D', expected: true, label: '"Dev D" exact → Dev D' },
      { g: 'devd', a: 'Dev D', expected: true, label: '"devd" compact → Dev D' },
      { g: 'dev', a: 'Dev D', expected: true, label: '"dev" single word → Dev D' },

      // Aliases
      { g: 'spiderman', a: 'Spider Man', expected: true, label: '"spiderman" alias → Spider Man' },
      { g: 'bahubali', a: 'Baahubali', expected: true, label: '"bahubali" alias → Baahubali' },

      // Hindi / regional titles with common typos
      { g: 'dilwale', a: 'Dilwale Dulhania Le Jayenge', expected: true, label: '"dilwale" → DDLJ' },
      { g: 'dulhania', a: 'Dilwale Dulhania Le Jayenge', expected: true, label: '"dulhania" → DDLJ' },
      { g: 'jayenge', a: 'Dilwale Dulhania Le Jayenge', expected: true, label: '"jayenge" → DDLJ' },

      // Subtitle handling
      { g: 'infinity war', a: 'Avengers: Infinity War', expected: true, label: '"infinity war" → Avengers: Infinity War' },
      { g: 'infinity', a: 'Avengers: Infinity War', expected: true, label: '"infinity" → Avengers: Infinity War' },
      { g: 'avengers', a: 'Avengers: Infinity War', expected: true, label: '"avengers" → Avengers: Infinity War' },

      // Two-letter / very short guess that should NOT match
      { g: 'ab', a: 'Kabhi Khushi Kabhie Gham', expected: false, label: '"ab" too short ✗' },
      { g: 'hi', a: 'Dangal', expected: false, label: '"hi" stop word ✗' },
    ].map(t => ({ ...t, result: FM.isMatch(t.g, t.a) }));
  });

  for (const t of edgeCaseTests) {
    assert(t.label, t.result, t.expected);
  }

  // ════════════════════════════════════════════════════════════
  //  SUMMARY
  // ════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(50));
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    process.exitCode = 1;
  }
  console.log('═'.repeat(50));

  await browser.close();
})();
