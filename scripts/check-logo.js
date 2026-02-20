#!/usr/bin/env node
const http = require('http');
const https = require('https');
const { URL } = require('url');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(u, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async function main() {
  const base = process.env.FOMO_BASE || 'http://localhost:1234';
  console.log('→ Checking dev server at', base);

  let rootHtml;
  try {
    const r = await fetchBuffer(base + '/');
    if (r.status !== 200) throw new Error('root HTML status ' + r.status);
    rootHtml = r.body.toString('utf8');
  } catch (err) {
    console.error('✖ Failed to fetch root HTML:', err.message);
    process.exit(2);
  }

  // look for importmap entry or hashed logo filename
  let logoPath;
  const importmapMatch = rootHtml.match(/<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (importmapMatch) {
    try {
      const jm = JSON.parse(importmapMatch[1]);
      for (const val of Object.values(jm.imports || {})) {
        if (typeof val === 'string' && val.includes('logo_fomo')) { logoPath = val; break; }
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  if (!logoPath) {
    const m = rootHtml.match(/\/logo_fomo\.[a-z0-9]+\.(?:jpg|jpeg|png|svg)/i);
    if (m) logoPath = m[0];
  }
  if (!logoPath) {
    console.error('✖ Could not locate logo asset path in served HTML');
    process.exit(3);
  }

  console.log('→ Resolved served logo path:', logoPath);

  // fetch the image
  try {
    const img = await fetchBuffer(base + logoPath);
    if (img.status !== 200) { throw new Error('status ' + img.status); }
    const ct = img.headers['content-type'] || '';
    const header = img.body.slice(0, 4);
    const headerHex = header.toString('hex').match(/.{1,2}/g).join(' ');
    console.log('→ Logo fetch OK — status=200  content-type=' + ct);
    console.log('→ Logo first bytes (hex):', headerHex);
    const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
    if (!isJpeg) { console.error('✖ Asset does not appear to be a JPEG'); process.exit(4); }
    console.log('✔ Logo appears to be a valid JPEG and is served by the dev server.');
  } catch (err) {
    console.error('✖ Failed to fetch logo asset:', err.message);
    process.exit(5);
  }

  // confirm main JS references the logo
  const scriptMatch = rootHtml.match(/<script\s+src=["']([^"']+)["'][^>]*>/i);
  if (!scriptMatch) { console.error('✖ Could not find main script tag'); process.exit(6); }
  const mainJs = scriptMatch[1];
  console.log('→ Main JS path:', mainJs);
  try {
    const js = await fetchBuffer(base + mainJs);
    if (js.status !== 200) throw new Error('status ' + js.status);
    const txt = js.body.toString('utf8');
    if (txt.includes(logoPath) || txt.includes('logo_fomo')) {
      console.log('✔ Main JS references the logo asset.');
      console.log('\nRESULT: Logo is available and will be used by the running app — verification PASSED ✅');
      process.exit(0);
    } else {
      console.error('✖ Main JS does NOT reference the logo asset');
      process.exit(7);
    }
  } catch (err) {
    console.error('✖ Failed to fetch main JS:', err.message);
    process.exit(8);
  }
})();