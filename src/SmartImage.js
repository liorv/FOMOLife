import React, { useState, useCallback, useEffect } from 'react';

// lightweight image component with optional fallback and console warnings.
// After migrating to public/assets, there is no longer a need to resolve
// bundler-specific import shapes.
export default function SmartImage({ src, alt = '', className = '', style = {}, fallback = null, ...props }) {
  const [cur, setCur] = useState(src || fallback || '');

  useEffect(() => {
    setCur(src || fallback || '');
  }, [src, fallback]);

  const onErr = useCallback((e) => {
    try {
      console.warn('SmartImage failed to load:', e?.currentTarget?.src || cur);
    } catch {};
    if (fallback && cur !== fallback) setCur(fallback);
  }, [fallback, cur]);

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
