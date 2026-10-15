// Usage: node scripts/test_fuzzy_matcher.js
// Extracts the real FuzzyMatcher from index.html and checks accept/reject cases.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const start = src.indexOf('const FuzzyMatcher = {');
let depth = 0, end = -1;
for (let i = src.indexOf('{', start); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const FuzzyMatcher = new Function(src.slice(start, end) + '; return FuzzyMatcher;')();

// [guess, answer, shouldMatch]
const CASES = [
  // --- Must REJECT (wrong words that merely look similar) ---
  ['love', 'Close Up', false],
  ['lose', 'Close Up', true],
  ['clue', 'Close Up', false],
  ['cloth', 'Close Up', false],
  ['live', 'La La Land', false],
  ['land', 'Lanterns', false],
  ['lantern', 'Okja', false],
  ['mean', 'Moon', false],
  ['girls', 'Mean Girls', true],
  ['seven', 'Seven Samurai', true],
  ['seven', 'Snowpiercer', false],
  ['host', 'The Machinist', false],
  ['piku', 'Pulp Fiction', false],
  ['pulp', 'Pulp Fiction', true],
  ['rabbit', 'Jojo Rabbit', true],
  ['robot', 'Jojo Rabbit', false],
  ['star wars', 'Star Trek', false],
  ['the movie', '3 Idiots', false],
  ['what movie is this', 'The Wolf of Wall Street', false],
  ['hello everyone', 'Manchester by the Sea', false],
  ['the', 'The Wolf of Wall Street', false],
  ['wall', 'Chhichhore', false],
  ['dream', 'Requiem for a Dream', true],
  ['dreams', 'Requiem for a Dream', true],
  ['dram', 'Requiem for a Dream', true],

  // --- Must ACCEPT (exact, partial, typo, punctuation) ---
  ['close up', 'Close Up', true],
  ['CLOSE UP', 'Close Up', true],
  ['close-up', 'Close Up', true],
  ['closeup', 'Close Up', true],
  ['close', 'Close Up', true],
  ['clse up', 'Close Up', true],
  ['clos', 'Close Up', true],
  ['cloze', 'Close Up', true],
  ['la la land', 'La La Land', true],
  ['lalaland', 'La La Land', true],
  ['lala land', 'La La Land', true],
  ['okja', 'Okja', true],
  ['pulp fiction', 'Pulp Fiction (1994)', true],
  ['pulp fction', 'Pulp Fiction', true],
  ['rrr', 'RRR (2022)', true],
  ['snowpiercer', 'Snowpiercer (2013)', true],
  ['snowpirecer', 'Snowpiercer', true],
  ['budapest', 'The Grand Budapest Hotel', true],
  ['budapesht', 'The Grand Budapest Hotel', true],
  ['hotel', 'The Grand Budapest Hotel', true],
  ['grand hotel', 'The Grand Budapest Hotel', true],
  ['manchestr', 'Manchester by the Sea', true],
  ['sea', 'Manchester by the Sea', true],
  ['idiots', '3 Idiots', true],
  ['three idiots', '3 Idiots', true],
  ['mad max two', 'Mad Max 2', true],
  ['spidrman', 'Spider-Man: No Way Home', true],
  ['wolf of the street', 'The Wolf of Wall Street', true],
  ['superhero', 'Bhavesh Joshi Superhero', true],
  ['petta', 'Petta (2019)', true],
  ['jojo', 'Jojo Rabbit', true],
  ['the host', 'The Host (2006)', true],
  ['machinist', 'The Machinist (2004)', true],
  ['amelie', 'Amélie', true],
  ['lanterns', 'Lanterns (TV Series 2026)', true],
  ['lantern', 'Lanterns (TV Series 2026)', true],
  ['dwayne johnson', 'Dwayne Johnson', true],
  ['dwayne jhonson', 'Dwayne Johnson', true],
  ['pedro pascal', 'Pedro Pascal', true],
  ['pedro', 'Pedro Pascal', true],
  ['pascal', 'Pedro Pascal', true],
];

let fail = 0;
for (const [g, a, exp] of CASES) {
  const got = Boolean(FuzzyMatcher.isMatch(g, a));
  if (got !== exp) {
    fail++;
    console.log(`FAIL  guess="${g}"  answer="${a}"  expected=${exp}  got=${got}`);
  }
}
console.log(`\n${CASES.length - fail}/${CASES.length} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
