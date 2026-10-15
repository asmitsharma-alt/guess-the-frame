const fs = require('fs');
const src = fs.readFileSync('index.html', 'utf8');
const start = src.indexOf('const FuzzyMatcher = {');
let depth = 0, end = -1;
for (let i = src.indexOf('{', start); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
let fnStr = src.slice(start, end);
fnStr = fnStr.replace(
  'if (shorter.length >= 4 && longer.length - shorter.length <= 3 && longer.startsWith(shorter)) return true;',
  'if (shorter.length >= 4 && longer.length - shorter.length <= 3 && longer.startsWith(shorter)) { console.log("Matched: shorter/longer prefix", shorter, longer); return true; }'
);
fnStr = fnStr.replace(
  'if (c1.startsWith(c2) || c2.startsWith(c1)) return true;',
  'if (c1.startsWith(c2) || c2.startsWith(c1)) { console.log("Matched: c1/c2 prefix", c1, c2, "lenDiff=", lenDiff); return true; }'
);
fnStr = fnStr.replace(
  'if (dist <= 1) return true;',
  'if (dist <= 1) { console.log("Matched: dist <= 1", c1, c2, "dist=", dist); return true; }'
);
const FM = new Function(fnStr + '; return FuzzyMatcher;')();

console.log('--- TEST 1: gangster vs gangs ---');
FM.isWordMatch('gangster', 'gangs');

console.log('\n--- TEST 2: danger vs dangal ---');
FM.isWordMatch('danger', 'dangal');

console.log('\n--- TEST 3: car vs par ---');
FM.isWordMatch('car', 'par');
