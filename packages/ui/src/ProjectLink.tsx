import React from 'react';
import { isValidExternalUrl } from '@myorg/utils';

export function ProjectLink({ url, projectName }: { url: string | undefined; projectName: string }) {
  if (!isValidExternalUrl(url)) return null;

  return (
    <a
      href={url.trim()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open external link for ${projectName} (opens in a new tab)`}
      title="Open project link in a new tab"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      draggable={false}
      style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, marginLeft: 8, padding: 4, color: 'inherit' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" />
      </svg>
    </a>
  );
}
