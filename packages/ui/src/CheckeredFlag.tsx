import React from 'react';

export function CheckeredFlag() {
  return <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
    <path d="M5 27V3" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 4H26V19H6Z" fill="#fff" stroke="#111" strokeWidth="1" />
    <path d="M6 4H11V9H6ZM16 4H21V9H16ZM11 9H16V14H11ZM21 9H26V14H21ZM6 14H11V19H6ZM16 14H21V19H16Z" fill="#111" />
  </svg>;
}
