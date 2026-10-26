import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationSettingsModal } from '../../packages/ui/src/NotificationSettingsModal';

const settings = {
  createdByMe: { enabled: true, notifyBefore: '1d' },
  assignedToMe: { enabled: true, notifyBefore: '7d' },
  events: { ownTaskCompletions: true, othersTaskCompletions: false },
};
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

it('loads and independently saves activity choices, then refreshes notifications', async () => {
  const refresh = jest.fn();
  window.addEventListener('notification-settings-updated', refresh);
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Task activity' }));
  const own = await screen.findByRole('switch', { name: 'Tasks I complete' });
  expect(own).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Tasks others complete' })).not.toBeChecked();
  expect(screen.getByRole('switch', { name: 'Task assignments' })).toBeChecked();
  fireEvent.click(own);
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ ...settings, events: { ...settings.events, ownTaskCompletions: false } }),
  }));
  window.removeEventListener('notification-settings-updated', refresh);
});

it('restores the previous choice and shows an error when saving fails', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: false });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Task activity' }));
  const own = await screen.findByRole('switch', { name: 'Tasks I complete' });
  fireEvent.click(own);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save notification settings');
  expect(own).toBeChecked();
});

it.each(['Deadlines approaching', 'Deadlines missed', 'Milestones achieved'])('saves the %s toggle', async title => {
  const key = { 'Deadlines approaching': 'deadlinesApproaching', 'Deadlines missed': 'deadlinesMissed', 'Milestones achieved': 'milestonesAchieved' }[title]!;
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('switch', { name: title }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    body: JSON.stringify({ ...settings, events: { ...settings.events, [key]: false } }),
  })));
});

it('saves deadline reminder timing independently of task reminders', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.change(await screen.findByRole('combobox', { name: 'Deadline reminder timing' }), { target: { value: '7d' } });
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    body: JSON.stringify({ ...settings, deadlineNotifyBefore: '7d' }),
  })));
});

it('disables controls after a failed load instead of saving defaults over preferences', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load notification settings');
  fireEvent.click(await screen.findByRole('tab', { name: 'Task activity' }));
  expect(await screen.findByRole('switch', { name: 'Tasks I complete' })).toBeDisabled();
  expect(screen.getByRole('switch', { name: 'Task activity: all notifications' })).toBeDisabled();
});

it.each(['0d', '1d', '7d'])('saves the compact reminder selector value %s', async (notifyBefore) => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Due-date reminders' }));
  const timing = await screen.findByRole('combobox', { name: 'Tasks I created reminder timing' });
  fireEvent.change(timing, { target: { value: notifyBefore } });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ ...settings, createdByMe: { enabled: true, notifyBefore } }),
  })));
});

it('keeps reminder timing visible but disabled when its category is off', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Due-date reminders' }));
  const toggle = await screen.findByRole('switch', { name: 'Toggle tasks i created reminders' });
  fireEvent.click(toggle);
  const timing = screen.getByRole('combobox', { name: 'Tasks I created reminder timing' });
  await waitFor(() => expect(toggle).not.toBeDisabled());
  expect(timing).toBeDisabled();
  expect(timing).toHaveValue('1d');
});

it('provides a named dialog, focuses it, and closes with Escape', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ settings }) });
  const close = jest.fn();
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();
  const { unmount } = render(<NotificationSettingsModal onClose={close} />);
  const dialog = screen.getByRole('dialog', { name: 'Notification settings' });
  expect(dialog).toHaveFocus();
  await screen.findByRole('tab', { name: 'Task activity' });
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
  unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
});

it('keeps device controls in their own setup tab without a notification-type bulk switch', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ settings }) });
  render(<NotificationSettingsModal onClose={jest.fn()} deviceControls={<button>Enable on this device</button>} />);
  const deviceTab = await screen.findByRole('tab', { name: 'Browser & mobile' });
  expect(screen.queryByRole('button', { name: 'Enable on this device' })).not.toBeInTheDocument();
  fireEvent.click(deviceTab);
  expect(screen.getByRole('button', { name: 'Enable on this device' })).toBeVisible();
  expect(screen.getAllByRole('switch')).toHaveLength(1);
  expect(screen.getByRole('switch', { name: 'Enable notifications' })).toBeChecked();
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Browser & mobile');
});

it('uses the existing section names and icons as vertical tabs with only the selected options visible', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ settings }) });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  const tabs = await screen.findAllByRole('tab');
  expect(tabs.map(tab => tab.textContent)).toEqual([
    'flagDeadlines & milestones', 'task_altTask activity',
    'chat_bubble_outlineConversations & feedback', 'scheduleDue-date reminders',
  ]);
  expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Deadlines & milestones');
  expect(screen.queryByRole('switch', { name: 'Tasks I complete' })).not.toBeInTheDocument();
  fireEvent.click(tabs[1]!);
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Task activity');
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('switch', { name: 'Deadlines approaching' })).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it('supports vertical keyboard tab navigation, wrapping and Home/End', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ settings }) });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  const tabs = await screen.findAllByRole('tab');
  const navigate = (from: number, key: string, to: number) => {
    fireEvent.keyDown(tabs[from]!, { key });
    expect(tabs[to]).toHaveFocus();
    expect(tabs[to]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[to]).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabs[to]!.id);
  };
  navigate(0, 'ArrowDown', 1);
  navigate(1, 'End', 3);
  navigate(3, 'ArrowDown', 0);
  navigate(0, 'ArrowUp', 3);
  navigate(3, 'Home', 0);
});

it.each([
  ['Deadlines & milestones', ['deadlinesApproaching', 'deadlinesMissed', 'milestonesAchieved']],
  ['Task activity', ['ownTaskCompletions', 'othersTaskCompletions', 'taskAssignments']],
  ['Conversations & feedback', ['projectComments', 'taskComments', 'feedbackComments', 'feedbackStatusChanges']],
] as const)('turns all %s events off and on in one save per click, without changing other sections', async (title, keys) => {
  const allOn = { ...settings, events: { ...settings.events, othersTaskCompletions: true } };
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: allOn }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: title }));
  const toggle = screen.getByRole('switch', { name: `${title}: all notifications` });
  expect(toggle).toBeChecked();
  fireEvent.click(toggle);
  const off = { ...allOn, events: { ...allOn.events, ...Object.fromEntries(keys.map(key => [key, false])) } };
  await waitFor(() => expect(toggle).not.toBeDisabled());
  expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    method: 'PUT', body: JSON.stringify(off),
  }));
  expect(toggle).not.toBeChecked();
  expect(global.fetch).toHaveBeenCalledTimes(2);
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).not.toBeDisabled());
  expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({
      ...allOn, events: { ...allOn.events, ...Object.fromEntries(keys.map(key => [key, true])) },
    }),
  }));
  expect(toggle).toBeChecked();
  expect(global.fetch).toHaveBeenCalledTimes(3);
});

it('enables all events from a mixed tab and keeps the master switch in sync with individual changes', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Task activity' }));
  const all = screen.getByRole('switch', { name: 'Task activity: all notifications' });
  expect(all).not.toBeChecked();
  fireEvent.click(all);
  await waitFor(() => expect(all).not.toBeDisabled());
  expect(all).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Tasks others complete' })).toBeChecked();
  fireEvent.click(screen.getByRole('switch', { name: 'Tasks I complete' }));
  await waitFor(() => expect(all).not.toBeDisabled());
  expect(all).not.toBeChecked();
});

it('turns due-date reminders off and on together while preserving timing and other settings', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Due-date reminders' }));
  const all = screen.getByRole('switch', { name: 'Due-date reminders: all notifications' });
  fireEvent.click(all);
  await waitFor(() => expect(all).not.toBeDisabled());
  expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    body: JSON.stringify({
      ...settings, createdByMe: { ...settings.createdByMe, enabled: false },
      assignedToMe: { ...settings.assignedToMe, enabled: false },
    }),
  }));
  expect(screen.getByRole('combobox', { name: 'Tasks I created reminder timing' })).toBeDisabled();
  fireEvent.click(all);
  await waitFor(() => expect(all).not.toBeDisabled());
  expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    body: JSON.stringify(settings),
  }));
  expect(screen.getByRole('combobox', { name: 'Tasks assigned to me reminder timing' })).toHaveValue('7d');
});

it('restores every affected setting after a failed bulk save', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: false });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Task activity' }));
  const all = screen.getByRole('switch', { name: 'Task activity: all notifications' });
  fireEvent.click(all);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save notification settings');
  expect(all).not.toBeChecked();
  expect(screen.getByRole('switch', { name: 'Tasks I complete' })).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Tasks others complete' })).not.toBeChecked();
  expect(screen.getByRole('switch', { name: 'Task assignments' })).toBeChecked();
});

it('enables legacy Off reminder timings so turning a tab on actually schedules notifications', async () => {
  const legacy = {
    ...settings, deadlineNotifyBefore: 'off',
    createdByMe: { enabled: true, notifyBefore: 'off' },
    assignedToMe: { enabled: false, notifyBefore: '7d' },
  };
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: legacy }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  const deadlines = await screen.findByRole('switch', { name: 'Deadlines & milestones: all notifications' });
  expect(deadlines).not.toBeChecked();
  fireEvent.click(deadlines);
  await waitFor(() => expect(deadlines).not.toBeDisabled());
  expect(screen.getByRole('combobox', { name: 'Deadline reminder timing' })).toHaveValue('1d');
  fireEvent.click(screen.getByRole('tab', { name: 'Due-date reminders' }));
  const reminders = screen.getByRole('switch', { name: 'Due-date reminders: all notifications' });
  expect(reminders).not.toBeChecked();
  fireEvent.click(reminders);
  await waitFor(() => expect(reminders).not.toBeDisabled());
  expect(reminders).toBeChecked();
  expect(screen.getByRole('combobox', { name: 'Tasks I created reminder timing' })).toHaveValue('1d');
  expect(screen.getByRole('combobox', { name: 'Tasks assigned to me reminder timing' })).toHaveValue('7d');
  expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    body: JSON.stringify({
      ...legacy, deadlineNotifyBefore: '1d',
      events: { ...settings.events, deadlinesApproaching: true, deadlinesMissed: true, milestonesAchieved: true },
      createdByMe: { enabled: true, notifyBefore: '1d' },
      assignedToMe: { enabled: true, notifyBefore: '7d' },
    }),
  }));
});

it('disables all notifications without changing section preferences and keeps tabs browsable', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} deviceControls={<button>Enable on this device</button>} />);
  const master = await screen.findByRole('switch', { name: 'Enable notifications' });
  fireEvent.click(master);
  await waitFor(() => expect(master).not.toBeDisabled());
  expect(master).not.toBeChecked();
  expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    body: JSON.stringify({ ...settings, enabled: false }),
  }));
  expect(screen.getByText(/Your section preferences are preserved/)).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Task activity' }));
  expect(screen.getByRole('switch', { name: 'Tasks I complete' })).toBeDisabled();
  expect(screen.getByRole('switch', { name: 'Tasks I complete' })).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Tasks others complete' })).not.toBeChecked();
  expect(screen.getByRole('switch', { name: 'Task activity: all notifications' })).toBeDisabled();
  fireEvent.click(screen.getByRole('tab', { name: 'Due-date reminders' }));
  expect(screen.getByRole('combobox', { name: 'Tasks I created reminder timing' })).toBeDisabled();
  fireEvent.click(screen.getByRole('tab', { name: 'Browser & mobile' }));
  expect(screen.getByRole('button', { name: 'Enable on this device' })).toBeDisabled();
});

it('requests permission before saving master enable and preserves the existing individual choices', async () => {
  const disabled = { ...settings, enabled: false };
  let resolvePermission!: () => void;
  const enable = jest.fn(() => new Promise<void>(resolve => { resolvePermission = resolve; }));
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: disabled }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} onEnableNotifications={enable} />);
  const master = await screen.findByRole('switch', { name: 'Enable notifications' });
  fireEvent.click(master);
  expect(enable).toHaveBeenCalledTimes(1);
  expect(master).toBeDisabled();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  resolvePermission();
  await waitFor(() => expect(master).toBeChecked());
  expect(global.fetch).toHaveBeenLastCalledWith('/api/tasks/notification-settings', expect.objectContaining({
    body: JSON.stringify({ ...settings, enabled: true }),
  }));
  fireEvent.click(screen.getByRole('tab', { name: 'Task activity' }));
  expect(screen.getByRole('switch', { name: 'Tasks others complete' })).not.toBeChecked();
});

it('shows browser permission guidance without preventing in-app notifications', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: { ...settings, enabled: false } }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} onEnableNotifications={async () => 'Allow notifications in browser settings.'} />);
  const master = await screen.findByRole('switch', { name: 'Enable notifications' });
  fireEvent.click(master);
  expect(await screen.findByText('Allow notifications in browser settings.')).toBeVisible();
  await waitFor(() => expect(master).toBeChecked());
});

it.each(['permission', 'save'])('keeps the master off and exposes %s failures', async failure => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings: { ...settings, enabled: false } }) })
    .mockResolvedValue({ ok: false });
  const enable = failure === 'permission'
    ? jest.fn().mockRejectedValue(new Error('Could not register this device'))
    : jest.fn().mockResolvedValue(undefined);
  render(<NotificationSettingsModal onClose={jest.fn()} onEnableNotifications={enable} />);
  const master = await screen.findByRole('switch', { name: 'Enable notifications' });
  fireEvent.click(master);
  expect(await screen.findByRole('alert')).toHaveTextContent(failure === 'permission' ? 'Could not register this device' : 'Could not save notification settings');
  expect(master).not.toBeChecked();
  expect(master).not.toBeDisabled();
});
