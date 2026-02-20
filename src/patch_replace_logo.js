const fs = require('fs');
const p = 'src/App.js';
let s = fs.readFileSync(p, 'utf8');
const old = '<img key={assetUrl(logoAsset)} src={assetUrl(logoAsset)} alt="FOMO Life logo" className="app-logo" onError={(e)=>{ e.currentTarget.style.display=\'none\'; }} />';
const nw = ['<img',
'            key={assetUrl(logoAsset)}',
'            src={assetUrl(logoAsset)}',
'            alt="FOMO Life logo"',
'            className="app-logo"',
'            style={{ display: "inline-block" }}',
'          />'].join('\n');
if (s.indexOf(old) === -1) {
  console.log('pattern not found');
  process.exit(0);
}
s = s.replace(old, nw);
fs.writeFileSync(p, s, 'utf8');
console.log('patched');
