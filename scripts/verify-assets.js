const fs = require('fs');
const path = require('path');

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

/** Recursively collect files matching an extension list under a directory. */
function findFiles(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// scan JS/JSX for image imports
const jsFiles = findFiles(path.join(workspace, 'src'), ['.js', '.jsx']);
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
const htmlFiles = findFiles(path.join(workspace, 'src'), ['.html']);
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
