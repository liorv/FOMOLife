// Utility helpers for normalizing imported/static asset references

// Normalize asset imports that may be objects (bundlers like Parcel/webpack)
function assetUrl(a) {
  return (a && typeof a === 'object' && 'default' in a) ? a.default : a;
}

function resolveAsset(a) {
  if (!a) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'object') {
    // common explicit fields
    if ('default' in a && typeof a.default === 'string') return a.default;
    if ('url' in a && typeof a.url === 'string') return a.url;
    if ('src' in a && typeof a.src === 'string') return a.src;

    // handle bundlers that return an object with other string props (e.g. Parcel)
    for (const k of Object.keys(a)) {
      const v = a[k];
      if (typeof v === 'string' && /\.(png|jpe?g|svg|gif|webp)(\?.*)?$/i.test(v)) return v;
    }

    // array-like first string
    if (Array.isArray(a) && a.length && typeof a[0] === 'string') return a[0];
  }
  try { return String(a); } catch { return ''; }
}

module.exports = { assetUrl, resolveAsset };
