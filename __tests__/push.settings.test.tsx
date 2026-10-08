import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';
import { NotificationSettingsModal } from '@myorg/ui';
import { ensurePushSubscription, getPushPermissionStatus } from '@/lib/client/pushNotifications';

jest.mock('@/lib/client/pushNotifications', () => ({
  ensurePushSubscription: jest.fn(), getPushPermissionStatus: jest.fn(),
}));

describe('notification setup controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPushPermissionStatus).mockReturnValue('disabled');
    jest.mocked(ensurePushSubscription).mockResolvedValue('disabled');
  });

  it('enables from a button tap and then offers a test notification', async () => {
    render(<PushNotificationSettings />);
    const enable = await screen.findByRole('button', { name: 'Enable on this device' });
    await waitFor(() => expect(enable).not.toBeDisabled());
    jest.mocked(ensurePushSubscription).mockResolvedValueOnce('enabled');
    fireEvent.click(enable);
    expect(ensurePushSubscription).toHaveBeenLastCalledWith(true);
    expect(await screen.findByRole('button', { name: 'Send test notification' })).toBeInTheDocument();
  });

  it('explains blocked permissions instead of showing an unusable enable button', async () => {
    jest.mocked(getPushPermissionStatus).mockReturnValue('blocked');
    jest.mocked(ensurePushSubscription).mockResolvedValue('blocked');
    render(<PushNotificationSettings />);
    expect(await screen.findByText(/Notifications are blocked/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable on this device' })).not.toBeInTheDocument();
  });

  it('displays setup errors', async () => {
    jest.mocked(ensurePushSubscription).mockRejectedValue(new Error('Server is not configured'));
    render(<PushNotificationSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server is not configured');
  });

  it('shows test delivery failures', async () => {
    jest.mocked(getPushPermissionStatus).mockReturnValue('enabled');
    jest.mocked(ensurePushSubscription).mockResolvedValue('enabled');
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'No push could be sent' }) });
    render(<PushNotificationSettings />);
    const test = await screen.findByRole('button', { name: 'Send test notification' });
    await waitFor(() => expect(test).not.toBeDisabled());
    fireEvent.click(test);
    expect(await screen.findByRole('alert')).toHaveTextContent('No push could be sent');
  });

  it('does not present unsaved reminder preferences as saved', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {
        createdByMe: { enabled: true, notifyBefore: '1d' },
        assignedToMe: { enabled: true, notifyBefore: '1d' },
      } }) })
      .mockResolvedValueOnce({ ok: false });
    render(<NotificationSettingsModal onClose={() => {}} />);
    const toggle = await screen.findByRole('switch', { name: 'Toggle tasks i created reminders' });
    fireEvent.click(toggle);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});
