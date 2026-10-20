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
  const own = await screen.findByRole('switch', { name: 'Tasks I complete' });
  fireEvent.click(own);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save notification settings');
  expect(own).toBeChecked();
});

it('disables controls after a failed load instead of saving defaults over preferences', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load notification settings');
  expect(await screen.findByRole('switch', { name: 'Tasks I complete' })).toBeDisabled();
});

it.each(['0d', '1d', '7d'])('saves the compact reminder selector value %s', async (notifyBefore) => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ settings }) })
    .mockResolvedValue({ ok: true });
  render(<NotificationSettingsModal onClose={jest.fn()} />);
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
  await screen.findByRole('switch', { name: 'Tasks I complete' });
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
  unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
});

it('keeps device controls in a collapsed disclosure without removing them', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ settings }) });
  const { container } = render(<NotificationSettingsModal onClose={jest.fn()} deviceControls={<button>Enable on this device</button>} />);
  await screen.findByRole('switch', { name: 'Tasks I complete' });
  const disclosure = container.querySelector('details');
  expect(disclosure).not.toHaveAttribute('open');
  expect(screen.getByText('Enable on this device')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Browser & mobile'));
  expect(disclosure).toHaveAttribute('open');
});
