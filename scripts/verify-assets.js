const fs = require('fs');
const path = require('path');
const glob = require('glob');

const workspace = process.cwd();
let failed = false;
const missing = [];

function checkFile(p) {
  if (!fs.existsSync(p)) return false;
  const s = fs.statSync(p);
  return s.size > 0;
}

function resolveLocal(baseFile, rel) {
  if (rel.startsWith('/')) return path.join(workspace, rel.replace(/^\//, ''));
  return path.resolve(path.dirname(baseFile), rel);
}

// scan JS/JSX for image imports
const jsFiles = glob.sync('src/**/*.{js,jsx}', { nodir: true });
for (const f of jsFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const re = /from\s+['"]([^'"]+\.(?:png|jpe?g|svg|gif|webp))(?:\?.*)?['"]/gi;
  let m;
  while ((m = re.exec(text))) {
    const rel = m[1];
    if (!rel.startsWith('.')) continue; // skip package/absolute imports
    const p = resolveLocal(f, rel);
    if (!checkFile(p)) { missing.push({ file: f, ref: rel, resolved: p }); failed = true; }
  }
}

// scan HTML files for local asset references
const htmlFiles = glob.sync('src/**/*.html', { nodir: true });
for (const f of htmlFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const re = /(?:src|href)=['"]([^'"]+\.(?:png|jpe?g|svg|gif|webp))(?:\?.*)?['"]/gi;
  let m;
  while ((m = re.exec(text))) {
    const rel = m[1];
    if (rel.startsWith('http')) continue;
    const p = resolveLocal(f, rel);
    if (!checkFile(p)) { missing.push({ file: f, ref: rel, resolved: p }); failed = true; }
  }
}

if (missing.length) {
  console.error('\n✖ Missing or empty asset files detected:');
  missing.forEach(x => console.error(` - ${x.ref} (referenced from ${x.file}) -> ${x.resolved}`));
  process.exit(2);
}

console.log('✔ All referenced local image assets exist and are non-empty.');
process.exit(0);
