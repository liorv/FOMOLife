const path = require('path');
const fs = require('fs');

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      res.push(...collectFiles(full));
    } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
      res.push(full);
    }
  }
  return res;
}

describe('tasks server smoke import', () => {
  it('requires server modules without throwing', () => {
    const base = path.join(__dirname, '..');
    const candidates = [path.join(base, 'lib', 'server'), path.join(base, 'app', 'api')];
    const files = candidates.flatMap(collectFiles);
    for (const f of files) {
      // require each file to surface any import-time errors
      // eslint-disable-next-line global-require,import/no-dynamic-require
      require(f);
    }
  });
});
