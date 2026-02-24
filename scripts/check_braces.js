const fs = require('fs');
const path = 'unit-tests/App.test.js';
const text = fs.readFileSync(path, 'utf8');
const lines = text.split(/\r?\n/);
let bal = 0;
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '{') {
      bal++;
      console.log(`line ${i+1} col ${j+1} ++ balance=${bal}`);
    } else if (ch === '}') {
      bal--;
      console.log(`line ${i+1} col ${j+1} -- balance=${bal}`);
    }
  }
}
console.log('final balance', bal);
