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
}

export default function TabNav<T extends string>({ active, tabs, onChange }: TabNavProps<T>) {
  // split the provided tabs into left and right areas around the thumb
  const leftTabs = tabs.filter((t) => t.key === 'tasks' || t.key === 'projects');
  const rightTabs = tabs.filter((t) => t.key === 'people');

  const renderTab = (tab: TabLink<T>) => (
    <button
      key={tab.key}
      className={`${active === tab.key ? 'active' : ''} tab-${tab.key}`}
      onClick={() => onChange(tab.key)}
      aria-current={active === tab.key ? 'page' : undefined}
    >
      <span className="material-icons tab-icon">{tab.icon}</span>
      <span className="tab-label">{tab.label}</span>
    </button>
  );

  return (
    <nav className="tabs" role="navigation" aria-label="App navigation">
      <div className="tabs-group tabs-left">
        {leftTabs.map(renderTab)}
      </div>

      <ThumbButton
        className="tabs-thumb-btn"
        ariaLabel="Thumb"
      />

      <div className="tabs-group tabs-right">
        {rightTabs.map(renderTab)}
        {/* hamburger placeholder */}
        <button className="tab-hamburger" aria-label="Menu" disabled>
          <span className="material-icons tab-icon">menu</span>
        </button>
      </div>
    </nav>
  );
}