'use client';

import React from 'react';

interface EntityIconProps {
  src: string;
  size: 16 | 20;
  initial?: string;
  iconColor?: string;
  title?: string;
}

/**
 * Renders an entity (project/contact) icon image with a letter-initial fallback
 * when the image fails to load or is unavailable.
 */
export default function EntityIcon({ src, size, initial, iconColor, title }: EntityIconProps) {
  const [err, setErr] = React.useState(false);

  if (err) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '4px',
          background: iconColor || 'var(--color-warning, #f59e0b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === 20 ? '11px' : '9px',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
          ...(size === 20 ? { marginTop: '2px' } : {}),
        }}
        title={title}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title ?? ''}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '4px',
        objectFit: 'cover',
        ...(size === 20 ? { marginTop: '2px' } : {}),
      }}
      title={title}
      onError={() => setErr(true)}
    />
  );
}
