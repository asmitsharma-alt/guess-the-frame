const fs = require('fs');
const term = process.argv[2];
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes(term.toLowerCase())) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
