import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import FrameworkHost from '../FrameworkHost';
import type { FrameworkTab } from '@/lib/frameworkConfig';

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/',
  useSearchParams: () => mockSearchParams,
}));
jest.mock('@myorg/ui', () => ({
  LogoBar: ({ searchValue, onSearchChange }: { searchValue: string; onSearchChange: (value: string) => void }) => (
    <input aria-label="Global search" value={searchValue} onChange={event => onSearchChange(event.target.value)} />
  ),
  TabNav: ({ tabs, onChange }: { tabs: { key: FrameworkTab; label: string }[]; onChange: (tab: FrameworkTab) => void }) => (
    <nav>{tabs.map(tab => <button key={tab.key} onClick={() => onChange(tab.key)}>{tab.label}</button>)}</nav>
  ),
}));
jest.mock('../HomePage', () => ({ __esModule: true, default: () => null }));
jest.mock('../projects/ProjectsPage', () => ({ __esModule: true, default: () => null }));
jest.mock('../contacts/ContactsPage', () => ({ __esModule: true, default: () => null }));
jest.mock('../FeedbackPage', () => ({ __esModule: true, default: () => null }));
jest.mock('../ColorPickerOverlay', () => ({ __esModule: true, default: () => null }));
jest.mock('../NotificationBell', () => ({ NotificationBell: () => null }));
jest.mock('../PushNotificationSettings', () => ({ PushNotificationSettings: () => null }));

async function renderHost() {
  return act(async () => render(
    <FrameworkHost appName="FOMO Life" userId="user" userName="User" userInitials="U" canSignOut={false} />
  ));
}

describe('global search on manual tab navigation', () => {
  const originalFetch = global.fetch;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams('tab=tasks&q=existing&taskId=task&keep=value');
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ versions: {}, dbSource: 'test' }) });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
    window.matchMedia = originalMatchMedia;
  });

  it.each([
    ['tasks', 'Home'],
    ['projects', 'Projects'],
    ['people', 'Contacts'],
    ['feedback', 'Feedback'],
  ])('clears search immediately when selecting %s', async (tab, label) => {
    mockSearchParams.set('tab', tab === 'tasks' ? 'people' : 'tasks');
    await renderHost();
    expect(screen.getByLabelText('Global search')).toHaveValue('existing');
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.getByLabelText('Global search')).toHaveValue('');
    expect(mockReplace).toHaveBeenLastCalledWith(`/?tab=${tab}&keep=value`);
  });

  it('cancels a pending search write so it cannot restore the old tab or query', async () => {
    await renderHost();
    fireEvent.change(screen.getByLabelText('Global search'), { target: { value: 'pending search' } });
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }));
    act(() => { jest.advanceTimersByTime(300); });
    expect(screen.getByLabelText('Global search')).toHaveValue('');
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenLastCalledWith('/?tab=people&keep=value');
  });

  it('clears project view and section targets when leaving Projects', async () => {
    mockSearchParams = new URLSearchParams('tab=projects&projectId=p&view=roadmap&subprojectId=s');
    await renderHost();
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }));
    expect(mockReplace).toHaveBeenLastCalledWith('/?tab=people');
  });

  it('clears search on mobile tab swipes', async () => {
    const { container } = await renderHost();
    const main = container.querySelector('main')!;
    fireEvent.touchStart(main, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 50, clientY: 100 }] });
    expect(screen.getByLabelText('Global search')).toHaveValue('');
    expect(mockReplace).toHaveBeenLastCalledWith('/?tab=projects&keep=value');
  });

  it('does not change tabs when a horizontal swipe starts in a graph scroller', async () => {
    const { container } = await renderHost();
    const main = container.querySelector('main')!;
    const graph = document.createElement('div');
    graph.dataset.tabSwipeIgnore = 'true';
    main.appendChild(graph);

    fireEvent.touchStart(graph, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(graph, { changedTouches: [{ clientX: 50, clientY: 100 }] });

    expect(screen.getByLabelText('Global search')).toHaveValue('existing');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('preserves a search query supplied by a direct link', async () => {
    mockSearchParams = new URLSearchParams('tab=people&q=linked search');
    await renderHost();
    expect(screen.getByLabelText('Global search')).toHaveValue('linked search');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
