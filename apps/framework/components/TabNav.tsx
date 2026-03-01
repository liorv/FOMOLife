'use client';

import type { FrameworkTab, FrameworkTabLink } from '@/lib/frameworkConfig';

type TabNavProps = {
  active: FrameworkTab;
  tabs: FrameworkTabLink[];
  onChange: (tab: FrameworkTab) => void;
};

export default function TabNav({ active, tabs, onChange }: TabNavProps) {
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
