'use client';

import React from 'react';
import ThumbButton from './ThumbButton';
export interface TabLink<T extends string> {
  key: T;
  label: string;
  icon: string;
}

export interface TabNavProps<T extends string> {
  active: T;
  tabs: TabLink<T>[];
  onChange: (tab: T) => void;
  onThumbButtonClick?: () => void;
  onCenterButtonClick?: () => void;
  thumbIcon?: string;
}

export default function TabNav<T extends string>({ active, tabs, onChange, onThumbButtonClick, onCenterButtonClick, thumbIcon }: TabNavProps<T>) {
  const handleThumbClick = onThumbButtonClick ?? onCenterButtonClick;

  return (
    <nav className="tabs" role="navigation" aria-label="App navigation">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={active === tab.key ? 'active' : ''}
          onClick={() => onChange(tab.key)}
          aria-current={active === tab.key ? 'page' : undefined}
        >
          <span className="material-icons tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
      <ThumbButton className="tabs-thumb-btn" icon={thumbIcon ?? 'add'} ariaLabel="Thumb" onClick={handleThumbClick} />
    </nav>
  );
}