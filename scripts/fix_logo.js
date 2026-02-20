const fs = require('fs');
const p = 'src/App.js';
let s = fs.readFileSync(p, 'utf8');

const marker = "const assetUrl = (a) => (a && typeof a === 'object' && 'default' in a) ? a.default : a;";
if (s.indexOf(marker) === -1) {
  console.error('marker not found');
  process.exit(1);
}

const insert = `\n// Robust resolver that ensures we always get a string URL for an imported asset.\nfunction resolveAsset(a) {\n  if (!a) return '';\n  if (typeof a === 'string') return a;\n  if (typeof a === 'object') {\n    if ('default' in a && typeof a.default === 'string') return a.default;\n    if ('url' in a && typeof a.url === 'string') return a.url;\n    if ('src' in a && typeof a.src === 'string') return a.src;\n  }\n  try { return String(a); } catch { return ''; }\n}\n\n// Compute a reliable logo URL. Prefer import.meta.url resolution, fall back to\n// the resolved imported asset value.\nconst logoUrl = (() => {\n  try {\n    return new URL('./assets/logo_fomo.png', import.meta.url).href;\n  } catch (err) {\n    return resolveAsset(assetUrl(logoAsset));\n  }\n})();\n`;

s = s.replace(marker, marker + insert);

// replace the img block
const oldImg = `<img\n            key={assetUrl(logoAsset)}\n            src={assetUrl(logoAsset)}\n            alt=\"FOMO Life logo\"\n            className=\"app-logo\"\n            style={{ display: \"inline-block\" }}\n          />`;
const newImg = `<img\n            src={logoUrl}\n            alt=\"FOMO Life logo\"\n            className=\"app-logo\"\n            style={{ display: 'inline-block' }}\n          />`;

if (s.indexOf(oldImg) !== -1) {
  s = s.replace(oldImg, newImg);
} else {
  // try a simpler match (in case formatting differs)
  s = s.replace(/<img[\s\S]*?className=\"app-logo\"[\s\S]*?>/, newImg);
}

fs.writeFileSync(p, s, 'utf8');
console.log('patched src/App.js');
