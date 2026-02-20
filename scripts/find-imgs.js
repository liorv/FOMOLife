const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('src/**/*.{js,jsx,html,htm}', { nodir: true });
let count = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<img')) {
      console.log(`${f}:${i+1}: ${lines[i].trim()}`);
      count++;
    }
  }
}
if (!count) console.log('No plain <img> tags found in src/ — good.');
else console.log(`Found ${count} <img> occurrences. Verify they point at /assets/ paths or add error-handling as desired.`);
process.exit(0);
