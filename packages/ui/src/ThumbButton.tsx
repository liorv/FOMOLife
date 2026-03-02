import React from 'react';

export interface ThumbButtonProps {
  icon?: string;
  ariaLabel?: string;
  onClick?: () => void;
  className?: string;
}

export default function ThumbButton({ icon = 'add', ariaLabel = 'Thumb', onClick, className }: ThumbButtonProps) {
  // if the icon string appears to be a URL/path to an SVG we render an <img>
  // rather than relying on the material-icons font. this lets individual apps
  // ship custom icons without touching shared styles.
  const isSvgPath = typeof icon === 'string' && (icon.endsWith('.svg') || icon.includes('/'));

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={onClick}>
      <span className="tabs-thumb-fab" aria-hidden="true">
        {isSvgPath ? (
          <img src={icon} alt="" className="tab-icon" />
        ) : (
          <span className="material-icons tab-icon">{icon}</span>
        )}
      </span>
      <span className="tab-label">{ariaLabel}</span>
    </button>
  );
}
