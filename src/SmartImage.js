/* eslint-disable no-restricted-syntax */
import React, { useState, useCallback, useEffect } from 'react';

// Minimal robust image component with fallback and tolerant logging.
// Accepts bundler-imported asset objects of many shapes — reuse `resolveAsset` so
// Parcel/webpack/other bundlers' variations are handled consistently.
const { resolveAsset } = require('./utils/assetResolver');
export default function SmartImage({ src, alt = '', className = '', style = {}, fallback = null, ...props }) {
  const normalize = s => {
    if (!s) return '';
    // prefer resolveAsset which knows many bundler shapes
    try {
      const r = resolveAsset(s);
      if (r) return r;
    } catch (_) {}
    // fallback to simple default property or string coercion
    if (s && typeof s === 'object' && 'default' in s) return s.default || '';
    return typeof s === 'string' ? s : '';
  };
  const initial = normalize(src) || normalize(fallback) || '';
  const [cur, setCur] = useState(initial);

  // keep `cur` in sync if caller changes `src` or `fallback`
  useEffect(() => {
    const next = normalize(src) || normalize(fallback) || '';
    if (next !== cur) setCur(next);
  }, [src, fallback]); // eslint-disable-line react-hooks/exhaustive-deps

  const onErr = useCallback((e) => {
    // Prefer warning (avoids dev-overlay treating this as a hard error),
    // but still provide useful debug info in console.
    try {
      // eslint-disable-next-line no-console
      console.warn('SmartImage failed to load:', e?.currentTarget?.src || cur);
    } catch (err) {
      /* ignore */
    }
    const resolvedFallback = normalize(fallback) || null;
    if (resolvedFallback && cur !== resolvedFallback) setCur(resolvedFallback);
  }, [fallback, cur]);

  // small built-in SVG fallback (data URL) if none provided
  const svgFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='52%' font-size='20' text-anchor='middle' fill='%238b8b8b' font-family='Arial' dy='.35em'>IMG</text></svg>";

  return (
    <img
      src={cur || svgFallback}
      alt={alt}
      className={className}
      style={style}
      onError={onErr}
      {...props}
    />
  );
}
