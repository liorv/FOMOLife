'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ContentMenu from './ContentMenu';
import LogoBar from './LogoBar';
import TabNav from './TabNav';
import { getFrameworkTabLinks, normalizeTab, type FrameworkTab } from '@/lib/frameworkConfig';

type FrameworkHostProps = {
  appName: string;
};

export default function FrameworkHost({ appName }: FrameworkHostProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = normalizeTab(searchParams.get('tab') ?? undefined);
  const tabs = useMemo(() => getFrameworkTabLinks(), []);
  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  const handleTabChange = (tab: FrameworkTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', tab);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <main className="main-layout">
      <LogoBar appName={appName} />
      <div className="app-outer">
        <div className="container framework-container">
          <ContentMenu active={activeTab} tabs={tabs} />
          <section className="host-pane" aria-label="Hosted app content">
            {activeTabConfig?.href ? (
              <iframe
                key={activeTabConfig.key}
                title={`${activeTabConfig.label} app`}
                src={activeTabConfig.href}
                className="host-frame"
              />
            ) : (
              <div className="host-empty">
                <h2>{activeTabConfig?.label ?? 'App'} URL not configured</h2>
                <p>Set NEXT_PUBLIC_*_APP_URL variables in this app to host the migrated tabs.</p>
              </div>
            )}
          </section>
        </div>
        <TabNav active={activeTab} tabs={tabs} onChange={handleTabChange} />
      </div>
    </main>
  );
}
