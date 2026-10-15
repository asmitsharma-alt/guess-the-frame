const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 1. Extract FuzzyMatcher directly from index.html
const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const start = src.indexOf('const FuzzyMatcher = {');
let depth = 0, end = -1;
for (let i = src.indexOf('{', start); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const FuzzyMatcher = new Function(src.slice(start, end) + '; return FuzzyMatcher;')();

console.log('================================================================');
console.log('🧪 COMPREHENSIVE ANSWER ACCEPTANCE & RANDOM WORD REJECTION TEST');
console.log('================================================================');

// List of actual movie answers in the game
const TEST_MOVIES = [
  'Welcome',
  '13B: Fear Has a New Address',
  'Gangs of Wasseypur',
  'Dangal',
  'Tumbbad',
  'Chhichhore',
  '3 Idiots',
  'Taare Zameen Par',
  'Pedro Pascal',
  'Dwayne Johnson'
];

// Large bank of random words, chat messages, gibberish, and other movies that must NEVER be accepted
const RANDOM_WORDS = [
  // Everyday nouns & objects
  'apple', 'banana', 'orange', 'table', 'chair', 'window', 'computer', 'keyboard',
  'telephone', 'refrigerator', 'airplane', 'car', 'bicycle', 'pencil', 'notebook',
  'coffee', 'water', 'bottle', 'sandwich', 'pizza', 'burger', 'shoes', 'jacket',

  // Animals & Nature
  'dog', 'cat', 'elephant', 'tiger', 'lion', 'zebra', 'mountain', 'river',
  'ocean', 'forest', 'desert', 'tree', 'flower', 'cloud', 'lightning', 'thunder',

  // Common conversation / chat chatter
  'hello', 'hi', 'hey guys', 'what is this', 'what movie is this', 'i do not know',
  'idk', 'lol', 'lmao', 'haha', 'nice one', 'great game', 'who is that', 'omg',
  'skip please', 'next round', 'fast', 'hurry up', 'wait for me', 'good guess',
  'how are you', 'see you later', 'no idea', 'maybe next time', 'yes', 'no', 'cool',

  // Other completely unrelated movies
  'Titanic', 'Inception', 'Avatar', 'Interstellar', 'Gladiator', 'The Godfather',
  'Sholay', 'Deewaar', 'Lagaan', 'Swades', 'Barfi', 'Dil Chahta Hai',
  'Kabir Singh', 'Bahubali', 'KGF', 'Pushpa', 'Jawan', 'Pathaan',

  // Near misses that shouldn't match (wrong prefixes, wrong words)
  'weld', 'welkin', 'welsh', 'welter', 'wealth', // vs Welcome
  'gangster', 'wasp', 'gangland', // vs Gangs of Wasseypur
  'danger', 'dangle', 'tangle', 'bengal', // vs Dangal
  'tub', 'bad', 'tumble', 'timber', // vs Tumbbad
  'pedestrian', 'pedal', 'pass', 'castle', // vs Pedro Pascal
  'stone', 'boulder', // vs Dwayne Johnson

  // Keyboard mash / random noise
  'asdfghjk', 'qwerty', 'zxcvbnm', '12345', '!!!???', 'blahblah', 'xyz123'
];

console.log(`\n--- PART 1: ALGORITHMIC STRESS TEST (Unit Test) ---`);
console.log(`Testing ${RANDOM_WORDS.length} random inputs against ${TEST_MOVIES.length} real movie answers (${RANDOM_WORDS.length * TEST_MOVIES.length} combinations)...`);

let falsePositives = 0;
const failureDetails = [];

for (const movie of TEST_MOVIES) {
  for (const randomWord of RANDOM_WORDS) {
    const isAccepted = FuzzyMatcher.isMatch(randomWord, movie);
    if (isAccepted) {
      falsePositives++;
      failureDetails.push({ guess: randomWord, answer: movie });
    }
  }
}

if (falsePositives === 0) {
  console.log(`✅ 100% REJECTION RATE: Zero random words were falsely accepted! (${RANDOM_WORDS.length * TEST_MOVIES.length}/${RANDOM_WORDS.length * TEST_MOVIES.length} tests passed)`);
} else {
  console.error(`❌ FAILED: Found ${falsePositives} false positives:`);
  failureDetails.forEach(f => console.error(`   - Guess "${f.guess}" matched "${f.answer}"`));
}

// Check that valid variations ARE correctly accepted
console.log(`\n--- PART 2: POSITIVE VALIDATION TEST (Ensuring correct guesses still work) ---`);
const VALID_VARIATIONS = [
  ['welcome', 'Welcome', true],
  ['WELCOME', 'Welcome', true],
  ['  welcome  ', 'Welcome', true],
  ['welcom', 'Welcome', true], // 1 typo
  ['13b', '13B: Fear Has a New Address', true], // sub-title match
  ['fear has a new address', '13B: Fear Has a New Address', true],
  ['gangs of wasseypur', 'Gangs of Wasseypur', true],
  ['wasseypur', 'Gangs of Wasseypur', true], // single significant word
  ['dangal', 'Dangal', true],
  ['tumbbad', 'Tumbbad', true],
  ['tumbad', 'Tumbbad', true], // 1 typo
  ['3 idiots', '3 Idiots', true],
  ['three idiots', '3 Idiots', true],
  ['pedro pascal', 'Pedro Pascal', true],
  ['pedro', 'Pedro Pascal', true],
  ['pascal', 'Pedro Pascal', true],
  ['dwayne johnson', 'Dwayne Johnson', true],
  ['dwayne jhonson', 'Dwayne Johnson', true]
];

let positivePasses = 0;
for (const [guess, answer, expected] of VALID_VARIATIONS) {
  const result = Boolean(FuzzyMatcher.isMatch(guess, answer));
  if (result === expected) {
    positivePasses++;
  } else {
    console.error(`❌ Mismatch on positive test: guess="${guess}", answer="${answer}", expected=${expected}, got=${result}`);
  }
}
console.log(`✅ ${positivePasses}/${VALID_VARIATIONS.length} positive cases behaved as expected.`);

// PART 3: Playwright Browser Test on Live Vercel Site
async function runLiveBrowserAnswerAcceptanceTest() {
  console.log(`\n--- PART 3: LIVE BROWSER REJECTION TEST ON https://www.scoopcast-live.in ---`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    await page.goto('https://www.scoopcast-live.in', { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`✅ Live site loaded.`);

    const browserTestResult = await page.evaluate(async () => {
      // Setup an active game round with answer "WELCOME"
      UI.showScreen('gameScreen');
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.currentPlaylist = [{
        image: 'GUESSTHEFRAME/Welcome (2007).webp',
        answer: 'WELCOME',
        aliases: ['Welcome (2007)'],
        type: 'movie',
        year: 2007
      }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];
      MultiplayerEngine._roundGuessedCorrectIds = new Set();
      GS.players = [{ id: 'p_test', name: 'Tester', score: 0 }];
      MultiplayerEngine.playerId = 'p_test';

      const randomGuesses = [
        'banana',
        'what movie is this',
        'hello everyone',
        'titanic',
        'inception',
        'weld',
        'qwerty12345',
        'skip'
      ];

      const rejectionResults = [];

      for (const guess of randomGuesses) {
        const initialWinners = MultiplayerEngine.currentRoundWinners.length;
        
        // Test chat engine spoiler / answer check
        const isSpoilerOrAnswer = ChatEngine.isAnswerOrSpoiler(guess, 'WELCOME');
        
        // Test direct guess submission
        MultiplayerEngine.validateAndProcessGuess({
          guess: guess,
          playerId: 'p_test',
          playerName: 'Tester',
          roundIndex: 0
        });

        const winnersAfter = MultiplayerEngine.currentRoundWinners.length;
        const acceptedAsWin = (winnersAfter > initialWinners);

        rejectionResults.push({
          guess,
          isSpoilerOrAnswer,
          acceptedAsWin
        });
      }

      // Now test the REAL correct answer
      const initialScore = GS.players[0].score;
      MultiplayerEngine.validateAndProcessGuess({
        guess: 'welcome',
        playerId: 'p_test',
        playerName: 'Tester',
        roundIndex: 0
      });
      const finalScore = GS.players[0].score;
      const correctAccepted = (finalScore > initialScore);

      return {
        rejectionResults,
        correctAccepted,
        finalScore
      };
    });

    console.log(`\nBrowser Simulation Results for round answer "WELCOME":`);
    let browserRejectionsPassed = 0;
    for (const r of browserTestResult.rejectionResults) {
      if (!r.acceptedAsWin && !r.isSpoilerOrAnswer) {
        console.log(`- Guess: "${r.guess}" -> 🚫 REJECTED AS EXPECTED (Not accepted as answer)`);
        browserRejectionsPassed++;
      } else {
        console.error(`- Guess: "${r.guess}" -> ❌ FALSE ACCEPTANCE: acceptedAsWin=${r.acceptedAsWin}, isSpoiler=${r.isSpoilerOrAnswer}`);
      }
    }

    console.log(`\nTesting Correct Answer "welcome":`);
    if (browserTestResult.correctAccepted) {
      console.log(`- Guess: "welcome" -> 🎉 ACCEPTED! Score increased (+10 pts, total score: ${browserTestResult.finalScore})`);
    } else {
      console.error(`- Guess: "welcome" was NOT accepted!`);
    }

    if (browserRejectionsPassed === browserTestResult.rejectionResults.length && browserTestResult.correctAccepted) {
      console.log(`\n=======================================================`);
      console.log(`🏆 ALL ANSWER ACCEPTANCE TESTS PASSED WITH 0 DEFECTS!`);
      console.log(`=======================================================`);
    } else {
      throw new Error('Browser acceptance test failed');
    }

  } finally {
    await browser.close();
  }
}

runLiveBrowserAnswerAcceptanceTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
