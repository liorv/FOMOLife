import type { FrameworkTab, FrameworkTabLink } from '@/lib/frameworkConfig';

type ContentMenuProps = {
  active: FrameworkTab;
  tabs: FrameworkTabLink[];
};

export default function ContentMenu({ active, tabs }: ContentMenuProps) {
  return (
    <aside className="content-menu" aria-label="Content menu">
      <ul>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key} className={isActive ? 'active' : ''}>
              <span className="material-icons" aria-hidden="true">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {!tab.href && <span className="menu-note">URL not configured</span>}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
