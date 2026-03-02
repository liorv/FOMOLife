'use client';

import React from 'react';

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
    </nav>
  );
}