const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(content)) !== null) {
  count++;
  const attrs = match[1];
  const code = match[2];
  if (attrs.includes('application/ld+json') || attrs.includes('src=')) continue;
  try {
    new Function(code);
    console.log(`Script ${count}: Valid syntax (length: ${code.length})`);
  } catch (err) {
    console.error(`Script ${count} SYNTAX ERROR: ${err.message}`);
    process.exit(1);
  }
}
console.log('ALL SCRIPTS PARSED WITH ZERO SYNTAX ERRORS!');
