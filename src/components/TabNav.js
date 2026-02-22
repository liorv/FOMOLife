import React from 'react';

const tabs = [
  { key: 'tasks', label: 'Tasks', icon: 'check_circle' },
  { key: 'projects', label: 'Projects', icon: 'folder' },
  { key: 'dreams', label: 'Dreams', icon: 'lightbulb' },
  { key: 'people', label: 'People', icon: 'people' },
];

export default function TabNav({ active, onChange }) {
  return (
    <nav className="tabs" role="navigation">
      {tabs.map(t => (
        <button
          key={t.key}
          className={active === t.key ? 'active' : ''}
          onClick={() => onChange(t.key)}
        >
          <span className="material-icons tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
