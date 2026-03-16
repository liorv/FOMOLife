import React from 'react';

export interface ThumbButtonProps {
  ariaLabel?: string;
  className?: string;
}

export default function ThumbButton({ ariaLabel = 'Thumb', className }: ThumbButtonProps) {
  return (
    <button type="button" className={className} aria-label={ariaLabel} disabled>
      <span className="tabs-thumb-fab" aria-hidden="true" />
    </button>
  );
}
