/* eslint-disable no-restricted-syntax */
import React, { useState, useCallback } from 'react';

// Minimal robust image component with fallback and developer-visible logging.
export default function SmartImage({ src, alt = '', className = '', style = {}, fallback = null, ...props }) {
  const [cur, setCur] = useState(src || fallback);
  const onErr = useCallback((e) => {
    // log helpful debugging details
    try {
      // eslint-disable-next-line no-console
      console.error('SmartImage failed to load:', e?.currentTarget?.src || cur);
    } catch (err) {}
    if (fallback && cur !== fallback) setCur(fallback);
  }, [fallback, cur]);

  // small built-in SVG fallback (data URL) if none provided
  const svgFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='52%' font-size='20' text-anchor='middle' fill='%238b8b8b' font-family='Arial' dy='.35em'>IMG</text></svg>";
  const finalFallback = fallback || svgFallback;

  return (
    <img
      src={cur}
      alt={alt}
      className={className}
      style={style}
      onError={onErr}
      {...props}
    />
  );
}
