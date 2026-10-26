'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import type { NotificationEventSettings, TaskNotificationSettings, TaskNotifyBefore } from '@myorg/types';
import styles from './NotificationSettingsModal.module.css';

interface NotificationSettingsModalProps {
  onClose: () => void;
  deviceControls?: React.ReactNode;
  onEnableNotifications?: () => Promise<string | void>;
}

const DEFAULT_SETTINGS: TaskNotificationSettings = {
  createdByMe: { enabled: true, notifyBefore: '1d' },
  assignedToMe: { enabled: true, notifyBefore: '1d' },
};

const NOTIFY_BEFORE_OPTIONS: { label: string; value: TaskNotifyBefore }[] = [
  { label: 'On the due date', value: '0d' },
  { label: '1 day before', value: '1d' },
  { label: '1 week before', value: '7d' },
];

const EVENT_GROUPS: {
  title: string;
  icon: string;
  events: { key: keyof NotificationEventSettings; title: string }[];
}[] = [
  {
    title: 'Deadlines & milestones',
    icon: 'flag',
    events: [
      { key: 'deadlinesApproaching', title: 'Deadlines approaching' },
      { key: 'deadlinesMissed', title: 'Deadlines missed' },
      { key: 'milestonesAchieved', title: 'Milestones achieved' },
    ],
  },
  {
    title: 'Task activity',
    icon: 'task_alt',
    events: [
      { key: 'ownTaskCompletions', title: 'Tasks I complete' },
      { key: 'othersTaskCompletions', title: 'Tasks others complete' },
      { key: 'taskAssignments', title: 'Task assignments' },
    ],
  },
  {
    title: 'Conversations & feedback',
    icon: 'chat_bubble_outline',
    events: [
      { key: 'projectComments', title: 'Project comments' },
      { key: 'taskComments', title: 'Task comments' },
      { key: 'feedbackComments', title: 'Feedback comments' },
      { key: 'feedbackStatusChanges', title: 'Feedback status changes' },
    ],
  },
];

function NotificationSwitch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <span className={styles.switch}>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className={styles.track} aria-hidden="true" />
    </span>
  );
}

export function NotificationSettingsModal({ onClose, deviceControls, onEnableNotifications }: NotificationSettingsModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const tabsId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(EVENT_GROUPS[0]!.title);
  const [settings, setSettings] = useState<TaskNotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const notificationsEnabled = settings.enabled !== false;
  const optionsDisabled = saving || loadFailed || !notificationsEnabled;
  const tabs = [
    ...EVENT_GROUPS.map(({ title, icon }) => ({ title, icon })),
    { title: 'Due-date reminders', icon: 'schedule' },
    ...(deviceControls ? [{ title: 'Browser & mobile', icon: 'devices' }] : []),
  ];
  const allRemindersEnabled = settings.createdByMe.enabled && settings.createdByMe.notifyBefore !== 'off'
    && settings.assignedToMe.enabled && settings.assignedToMe.notifyBefore !== 'off';

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/tasks/notification-settings');
        if (!res.ok) throw new Error('Could not load notification settings. Close this panel and try again.');
        const d = await res.json();
        if (!d.settings) throw new Error('The server returned invalid notification settings.');
        if (active) setSettings(d.settings);
      } catch (reason) {
        if (active) {
          setLoadFailed(true);
          setError(reason instanceof Error ? reason.message : 'Could not load notification settings.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = async (next: TaskNotificationSettings) => {
    const previous = settings;
    setSettings(next);
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/tasks/notification-settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error('Could not save notification settings. Please try again.');
      window.dispatchEvent(new Event('notification-settings-updated'));
    } catch (reason) {
      setSettings(previous);
      setError(reason instanceof Error ? reason.message : 'Could not save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifications = async () => {
    setPermissionMessage('');
    if (notificationsEnabled) {
      await persist({ ...settings, enabled: false });
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Start permission requests directly from the user's gesture, before any network save.
      const message = await onEnableNotifications?.();
      if (message) setPermissionMessage(message);
      await persist({ ...settings, enabled: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not enable notifications. Please try again.');
      setSaving(false);
    }
  };

  const updateCategory = (
    category: 'createdByMe' | 'assignedToMe',
    patch: Partial<TaskNotificationSettings['createdByMe']>,
  ) => {
    void persist({ ...settings, [category]: { ...settings[category], ...patch } });
  };

  const renderCategory = (category: 'createdByMe' | 'assignedToMe', title: string) => {
    const cat = settings[category];
    return (
      <div className={styles.reminderRow}>
        <span>{title}</span>
        <select
          className={styles.timing}
          aria-label={`${title} reminder timing`}
          value={cat.notifyBefore}
          disabled={!cat.enabled || optionsDisabled}
          onChange={(event) => {
            const option = NOTIFY_BEFORE_OPTIONS.find((item) => item.value === event.target.value);
            if (option) updateCategory(category, { notifyBefore: option.value });
          }}
        >
          {cat.notifyBefore === 'off' && <option value="off">Off</option>}
          {NOTIFY_BEFORE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <NotificationSwitch
          label={`Toggle ${title.toLowerCase()} reminders`}
          checked={cat.enabled}
          disabled={optionsDisabled}
          onChange={() => updateCategory(category, {
            enabled: !cat.enabled,
            ...(!cat.enabled && cat.notifyBefore === 'off' ? { notifyBefore: '1d' } : {}),
          })}
        />
      </div>
    );
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== 'Tab') return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId}>Notification settings</h2>
            <p id={descriptionId}>Choose what reaches your bell and devices.</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close notification settings">
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className={styles.body}>
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <p className={styles.hint} role="status">
              Loading preferences...
            </p>
          ) : (
            <>
            <label className={`${styles.row} ${styles.masterRow}`}>
              <span>Enable notifications</span>
              <NotificationSwitch label="Enable notifications" checked={notificationsEnabled}
                disabled={saving || loadFailed} onChange={() => void toggleNotifications()} />
            </label>
            {!notificationsEnabled && <p className={styles.hint}>
              All notifications are off. Your section preferences are preserved and ignored until you enable notifications.
            </p>}
            {permissionMessage && <p className={styles.hint} role="status">{permissionMessage}</p>}
            <div className={styles.settingsLayout}>
              <div className={styles.tabs} role="tablist" aria-label="Notification sections" aria-orientation="vertical">
                {tabs.map((tab, index) => (
                  <button key={tab.title} type="button" role="tab"
                    id={`${tabsId}-tab-${index}`} aria-controls={`${tabsId}-panel-${index}`}
                    aria-selected={activeTab === tab.title} tabIndex={activeTab === tab.title ? 0 : -1}
                    className={styles.tab} onClick={() => setActiveTab(tab.title)}
                    onKeyDown={event => {
                      let nextIndex: number;
                      if (event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
                      else if (event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
                      else if (event.key === 'Home') nextIndex = 0;
                      else if (event.key === 'End') nextIndex = tabs.length - 1;
                      else return;
                      event.preventDefault();
                      setActiveTab(tabs[nextIndex]!.title);
                      document.getElementById(`${tabsId}-tab-${nextIndex}`)?.focus();
                    }}>
                    <span className="material-icons" aria-hidden="true">{tab.icon}</span>
                    <span>{tab.title}</span>
                  </button>
                ))}
              </div>
              <div className={styles.panels}>
              {EVENT_GROUPS.map((group, index) => {
                const allEnabled = group.events.every(({ key }) => settings.events?.[key] ?? true)
                  && (index !== 0 || settings.deadlineNotifyBefore !== 'off');
                return (
                <section key={group.title} className={styles.section} role="tabpanel"
                  id={`${tabsId}-panel-${index}`} aria-labelledby={`${tabsId}-tab-${index}`}
                  hidden={activeTab !== group.title}>
                  <h3>
                    <span className="material-icons" aria-hidden="true">
                      {group.icon}
                    </span>
                    {group.title}
                  </h3>
                  <label className={`${styles.row} ${styles.bulkRow}`}>
                    <span>All notifications</span>
                    <NotificationSwitch label={`${group.title}: all notifications`} checked={allEnabled}
                      disabled={optionsDisabled}
                      onChange={() => {
                        const events = { ...settings.events };
                        group.events.forEach(({ key }) => { events[key] = !allEnabled; });
                        void persist({
                          ...settings, events,
                          ...(index === 0 && !allEnabled && settings.deadlineNotifyBefore === 'off'
                            ? { deadlineNotifyBefore: '1d' } : {}),
                        });
                      }} />
                  </label>
                  <div className={styles.eventGrid}>
                    {group.events.map(({ key, title }) => (
                      <label key={key} className={styles.row}>
                        <span>{title}</span>
                        <NotificationSwitch
                          label={title}
                          checked={settings.events?.[key] ?? true}
                          disabled={optionsDisabled}
                          onChange={() =>
                            void persist({
                              ...settings,
                              events: { ...settings.events, [key]: !(settings.events?.[key] ?? true) },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  {group.title === 'Deadlines & milestones' && (
                    <label className={styles.reminderRow}>
                      <span>Deadline reminder timing</span>
                      <select
                        className={styles.timing}
                        aria-label="Deadline reminder timing"
                        value={settings.deadlineNotifyBefore ?? '1d'}
                        disabled={optionsDisabled || settings.events?.deadlinesApproaching === false}
                        onChange={event => {
                          const option = NOTIFY_BEFORE_OPTIONS.find(item => item.value === event.target.value);
                          if (option) void persist({ ...settings, deadlineNotifyBefore: option.value });
                        }}
                      >
                        {settings.deadlineNotifyBefore === 'off' && <option value="off">Off</option>}
                        {NOTIFY_BEFORE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </section>
                );
              })}
              <section className={styles.section} role="tabpanel"
                id={`${tabsId}-panel-${EVENT_GROUPS.length}`} aria-labelledby={`${tabsId}-tab-${EVENT_GROUPS.length}`}
                hidden={activeTab !== 'Due-date reminders'}>
                <h3>
                  <span className="material-icons" aria-hidden="true">
                    schedule
                  </span>
                  Due-date reminders
                </h3>
                <label className={`${styles.row} ${styles.bulkRow}`}>
                  <span>All notifications</span>
                  <NotificationSwitch label="Due-date reminders: all notifications"
                    checked={allRemindersEnabled}
                    disabled={optionsDisabled}
                    onChange={() => {
                      const enabled = !allRemindersEnabled;
                      void persist({
                        ...settings,
                        createdByMe: { ...settings.createdByMe, enabled,
                          ...(enabled && settings.createdByMe.notifyBefore === 'off' ? { notifyBefore: '1d' } : {}) },
                        assignedToMe: { ...settings.assignedToMe, enabled,
                          ...(enabled && settings.assignedToMe.notifyBefore === 'off' ? { notifyBefore: '1d' } : {}) },
                      });
                    }} />
                </label>
                {renderCategory('createdByMe', 'Tasks I created')}
                {renderCategory('assignedToMe', 'Tasks assigned to me')}
              </section>
              {deviceControls && (
                <section className={styles.section} role="tabpanel"
                  id={`${tabsId}-panel-${EVENT_GROUPS.length + 1}`} aria-labelledby={`${tabsId}-tab-${EVENT_GROUPS.length + 1}`}
                  hidden={activeTab !== 'Browser & mobile'}>
                  <h3><span className="material-icons" aria-hidden="true">devices</span>Browser &amp; mobile</h3>
                  <fieldset className={styles.deviceControls} disabled={optionsDisabled}>
                    <legend className={styles.deviceLegend}>Device notification setup</legend>
                    {deviceControls}
                  </fieldset>
                </section>
              )}
              {activeTab !== 'Browser & mobile' && <p className={styles.hint}>
                Turning a type off also hides its existing notifications.
              </p>}
              </div>
            </div>
            </>
          )}
        </div>
        <footer className={styles.footer}>
          <span role="status" aria-live="polite">
            {saving ? 'Saving...' : error ? 'Changes not saved' : loading ? 'Loading...' : 'Changes save automatically'}
          </span>
          <button type="button" className={styles.done} onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
