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
  /**
   * icon to display inside the thumb button. if omitted the component will
   * remember the last non-undefined value rather than momentarily showing a
   * default. this avoids a flash of the '+' glyph when the parent updates the
   * icon in response to a click.
   */
  thumbIcon?: string;
}

export default function TabNav<T extends string>({ active, tabs, onChange, onThumbButtonClick, onCenterButtonClick, thumbIcon }: TabNavProps<T>) {
  const handleThumbClick = onThumbButtonClick ?? onCenterButtonClick;

  // keep last provided icon to avoid rendering default plus when prop is
  // temporarily undefined during tab changes. start empty to eliminate any
  // initial flash.
  const [currentThumb, setCurrentThumb] = React.useState<string>(() => thumbIcon ?? '');
  React.useEffect(() => {
    if (thumbIcon !== undefined && thumbIcon !== null) {
      setCurrentThumb(thumbIcon);
    }
  }, [thumbIcon]);

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
        icon={currentThumb}
        ariaLabel="Thumb"
        onClick={handleThumbClick}
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