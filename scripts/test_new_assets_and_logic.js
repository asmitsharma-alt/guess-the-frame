const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

// Extract scripts to test GS and FuzzyMatcher
const scriptMatches = [...html.matchAll(/<script(?![^>]*(src|ld\+json))[^>]*>([\s\S]*?)<\/script>/gi)];

// Extract FuzzyMatcher
const startIdx = html.indexOf('const FuzzyMatcher = {');
if (startIdx === -1) {
  console.error('Could not find FuzzyMatcher');
  process.exit(1);
}
const endIdx = html.indexOf('const ChatEngine = {', startIdx);
const fmCode = html.slice(startIdx, endIdx);

const sandbox = {
  window: {},
  document: { addEventListener: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} }
};
vm.createContext(sandbox);
vm.runInContext(fmCode + '\n; this.FM = FuzzyMatcher;', sandbox);
const FM = sandbox.FM;

console.log('--- TESTING ROUND 6 GUESS MATCHING & REJECTION ---');
const r6Answer = 'VISH';
const r6Aliases = ['VISWJEET', 'VISHWAJEET'];

function isR6Match(guess) {
  return FM.isMatch(guess, r6Answer) || r6Aliases.some(a => FM.isMatch(guess, a));
}

const tests = [
  // Accepted guesses
  { guess: 'vish', expected: true },
  { guess: 'VISH', expected: true },
  { guess: 'viswjeet', expected: true },
  { guess: 'vishwajeet', expected: true },
  { guess: 'vishwajit', expected: true },
  // REJECTED guesses (MUST NOT MATCH)
  { guess: 'pedro', expected: false },
  { guess: 'pedro pascal', expected: false },
  { guess: 'pedro ka pyaasa', expected: false },
  { guess: 'pascal', expected: false },
  { guess: 'pyaasa', expected: false },
  { guess: 'guru dutt', expected: false },
  // Other movie tests
  { guess: '13b', answer: '13B', expected: true },
  { guess: '13B Fear Has a New Address', answer: '13B', expected: true },
  { guess: 'kaho na pyar hai', answer: 'KAHO NAA PYAAR HAI', expected: true },
  { guess: 'knph', answer: 'KAHO NAA PYAAR HAI', expected: true },
  { guess: 'rockstar', answer: 'ROCKSTAR', expected: true },
  { guess: 'gow', answer: 'GANGS OF WASSEYPUR', expected: true },
  { guess: 'gangs of wasseypur', answer: 'GANGS OF WASSEYPUR', expected: true },
  { guess: 'znmd', answer: 'ZINDAGI NA MILEGI DOBARA', expected: true },
  { guess: 'delhi belly', answer: 'DELHI BELLY', expected: true },
  { guess: 'swades', answer: 'SWADES', expected: true },
  { guess: 'whiplash', answer: 'WHIPLASH', expected: true },
  { guess: 'no country for old men', answer: 'NO COUNTRY FOR OLD MEN', expected: true },
  { guess: 'the prestige', answer: 'THE PRESTIGE', expected: true },
  { guess: 'prestige', answer: 'THE PRESTIGE', expected: true },
  { guess: 'shutter island', answer: 'SHUTTER ISLAND', expected: true },
  { guess: 'goodfellas', answer: 'GOODFELLAS', expected: true },
  { guess: 'good fellas', answer: 'GOODFELLAS', expected: true },
  { guess: 'aditi rao hydari', answer: 'ADITI RAO HYDARI', expected: true },
  { guess: 'cameron diaz', answer: 'CAMERON DIAZ', expected: true },
  { guess: 'jennifer lopez', answer: 'JENNIFER LOPEZ', expected: true },
  { guess: 'jlo', answer: 'JENNIFER LOPEZ', expected: true },
  { guess: 'jeremy allen white', answer: 'JEREMY ALLEN WHITE', expected: true },
  { guess: 'jodie comer', answer: 'JODIE COMER', expected: true },
  { guess: 'rachel brosnahan', answer: 'RACHEL BROSNAHAN', expected: true },
  { guess: 'sai pallavi', answer: 'SAI PALLAVI', expected: true },
  { guess: 'yami gautam', answer: 'YAMI GAUTAM', expected: true },
  { guess: 'zoe kravitz', answer: 'ZOE KRAVITZ', expected: true }
];

let failed = 0;
for (const t of tests) {
  let res;
  if (t.answer) {
    res = FM.isMatch(t.guess, t.answer);
  } else {
    res = isR6Match(t.guess);
  }
  const ok = res === t.expected;
  if (!ok) {
    console.error(`FAIL: guess="${t.guess}", expected=${t.expected}, got=${res}`);
    failed++;
  } else {
    console.log(`PASS: guess="${t.guess}" -> ${res} (expected ${t.expected})`);
  }
}

console.log('\n--- VERIFYING FILE ASSET PATHS IN HTML ---');
// Verify every content path in index.html exists on disk
const assetMatches = [...html.matchAll(/(GUESSTHEFRAME\/[^"']+\.webp|GUESSTHEEYES\/[^"']+\.webp)/g)];
const paths = [...new Set(assetMatches.map(m => m[1]))];
console.log(`Found ${paths.length} distinct WebP asset paths in index.html.`);

let missing = 0;
for (const p of paths) {
  if (!fs.existsSync(p)) {
    console.error(`MISSING ASSET: ${p}`);
    missing++;
  }
}

if (missing === 0) {
  console.log('ALL ASSET PATHS EXIST ON DISK!');
}

if (failed > 0 || missing > 0) {
  console.error(`\nFAILED: ${failed} logic errors, ${missing} missing files.`);
  process.exit(1);
} else {
  console.log('\nALL 38 TESTS PASSED PERFECTLY!');
}
