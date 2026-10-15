const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///C:/Users/admin/Documents/projects/scoop main/scoopcast-live/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.body.classList.add('bypass-restrict'));

  const testCases = [
    // DABANGG
    { guess: 'dabang', answer: 'DABANGG', note: 'single g' },
    { guess: 'dabaang', answer: 'DABANGG', note: 'double a' },
    { guess: 'dabbang', answer: 'DABANGG', note: 'double b' },
    { guess: 'dabanggg', answer: 'DABANGG', note: 'triple g' },
    { guess: 'daban', answer: 'DABANGG', note: 'missing last g (prefix)' },
    { guess: 'dbang', answer: 'DABANGG', note: 'missing middle vowel' },
    { guess: 'is it dabang bro', answer: 'DABANGG', note: 'embedded in casual chat' },

    // GANGS OF WASSEYPUR
    { guess: 'wasseypur', answer: 'GANGS OF WASSEYPUR', note: 'single core word' },
    { guess: 'waseypur', answer: 'GANGS OF WASSEYPUR', note: 'single s typo' },
    { guess: 'wasypur', answer: 'GANGS OF WASSEYPUR', note: 'missing e' },
    { guess: 'wasipur', answer: 'GANGS OF WASSEYPUR', note: 'phonetic i instead of ey' },
    { guess: 'waseyppur', answer: 'GANGS OF WASSEYPUR', note: 'extra p' },
    { guess: 'gangs', answer: 'GANGS OF WASSEYPUR', note: 'first title word' },
    { guess: 'gang', answer: 'GANGS OF WASSEYPUR', note: 'singular of gangs' },

    // 3 IDIOTS
    { guess: 'idiots', answer: '3 IDIOTS', note: 'single core word' },
    { guess: 'idiot', answer: '3 IDIOTS', note: 'singular form' },
    { guess: 'idots', answer: '3 IDIOTS', note: 'missing second i' },
    { guess: 'iditos', answer: '3 IDIOTS', note: 'swapped letters' },
    { guess: '3 idots', answer: '3 IDIOTS', note: 'digit + typo' },
    { guess: 'three idiots', answer: '3 IDIOTS', note: 'word number' },
    { guess: 'maybe 3 idiots bro', answer: '3 IDIOTS', note: 'casual chat with filler' },

    // WELCOME
    { guess: 'welcom', answer: 'WELCOME', note: 'missing final e' },
    { guess: 'wellcome', answer: 'WELCOME', note: 'double l typo' },
    { guess: 'welcomme', answer: 'WELCOME', note: 'double m typo' },
    { guess: 'welcome 2007', answer: 'WELCOME (2007)', note: 'with year' },

    // ROCKSTAR
    { guess: 'rokstar', answer: 'ROCKSTAR', note: 'missing c' },
    { guess: 'rockstarr', answer: 'ROCKSTAR', note: 'repeated final r' },
    { guess: 'rockster', answer: 'ROCKSTAR', note: 'er instead of ar' },

    // SWADES
    { guess: 'swadesh', answer: 'SWADES', note: 'sh ending common transliteration' },
    { guess: 'swadees', answer: 'SWADES', note: 'double e' },

    // DELHI BELLY
    { guess: 'delhi', answer: 'DELHI BELLY', note: 'first word only' },
    { guess: 'belly', answer: 'DELHI BELLY', note: 'second word only' },
    { guess: 'delhibelly', answer: 'DELHI BELLY', note: 'compact no space' },
    { guess: 'dilli belly', answer: 'DELHI BELLY', note: 'phonetic dilli' },

    // WHIPLASH
    { guess: 'wiplash', answer: 'WHIPLASH', note: 'missing silent h' },
    { guess: 'whiplas', answer: 'WHIPLASH', note: 'missing final h' },
    { guess: 'whiplashh', answer: 'WHIPLASH', note: 'double h' },

    // THE DARK KNIGHT
    { guess: 'knight', answer: 'THE DARK KNIGHT', note: 'last core word' },
    { guess: 'dark knight', answer: 'THE DARK KNIGHT', note: 'without article' },
    { guess: 'knite', answer: 'THE DARK KNIGHT', note: 'phonetic knite' },
    { guess: 'kight', answer: 'THE DARK KNIGHT', note: 'missing n typo' },
    { guess: 'dark night', answer: 'THE DARK KNIGHT', note: 'night instead of knight' },

    // DANGAL
    { guess: 'dangl', answer: 'DANGAL', note: 'missing a' },
    { guess: 'dangall', answer: 'DANGAL', note: 'double l' },
    { guess: 'dangaal', answer: 'DANGAL', note: 'double a' },
    { guess: 'dungle', answer: 'DANGAL', note: 'phonetic dungle' },

    // KAABIL
    { guess: 'kabil', answer: 'KAABIL', note: 'single a' },
    { guess: 'kabhil', answer: 'KAABIL', note: 'h typo' },
    { guess: 'kaabil', answer: 'KAABIL', note: 'exact' },

    // NEGATIVE GUARDS (These MUST fail / be rejected)
    { guess: 'what is this movie', answer: 'DABANGG', expected: false, note: 'NEGATIVE: common chat filler' },
    { guess: 'pizza', answer: 'GANGS OF WASSEYPUR', expected: false, note: 'NEGATIVE: completely unrelated' },
    { guess: 'superman', answer: 'THE DARK KNIGHT', expected: false, note: 'NEGATIVE: different superhero' },
    { guess: 'lol', answer: '3 IDIOTS', expected: false, note: 'NEGATIVE: chat acronym' },
    { guess: 'hi', answer: 'WELCOME', expected: false, note: 'NEGATIVE: 2-letter greeting' }
  ];

  console.log('================================================================');
  console.log('🧪 STRESS TESTING WORST-CASE / NEAR-MISS ANSWERS ACROSS MOVIES');
  console.log('================================================================\n');

  const results = await page.evaluate((cases) => {
    return cases.map(c => {
      const match = FuzzyMatcher.isMatch(c.guess, c.answer);
      const expected = c.expected !== undefined ? c.expected : true;
      return {
        ...c,
        actual: match,
        pass: match === expected
      };
    });
  }, testCases);

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    const status = r.actual ? 'ACCEPTED' : 'REJECTED';
    console.log(`${icon} [${status.padEnd(8)}] "${r.guess}" → "${r.answer}" (${r.note})`);
    if (r.pass) passed++;
    else failed++;
  }

  console.log('\n================================================================');
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  await browser.close();
})();
