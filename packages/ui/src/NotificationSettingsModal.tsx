'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import type { NotificationEventSettings, TaskNotificationSettings, TaskNotifyBefore } from '@myorg/types';
import styles from './NotificationSettingsModal.module.css';

interface NotificationSettingsModalProps {
  onClose: () => void;
  deviceControls?: React.ReactNode;
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

export function NotificationSettingsModal({ onClose, deviceControls }: NotificationSettingsModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<TaskNotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

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
          disabled={!cat.enabled || saving || loadFailed}
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
          disabled={saving || loadFailed}
          onChange={() => updateCategory(category, { enabled: !cat.enabled })}
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
            <div className={styles.settingsGrid}>
              {EVENT_GROUPS.map((group) => (
                <section key={group.title} className={styles.section} aria-label={group.title}>
                  <h3>
                    <span className="material-icons" aria-hidden="true">
                      {group.icon}
                    </span>
                    {group.title}
                  </h3>
                  <div className={styles.eventGrid}>
                    {group.events.map(({ key, title }) => (
                      <label key={key} className={styles.row}>
                        <span>{title}</span>
                        <NotificationSwitch
                          label={title}
                          checked={settings.events?.[key] ?? true}
                          disabled={saving || loadFailed}
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
                        disabled={saving || loadFailed || settings.events?.deadlinesApproaching === false}
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
              ))}
              <section className={`${styles.section} ${styles.reminders}`} aria-label="Due-date reminders">
                <h3>
                  <span className="material-icons" aria-hidden="true">
                    schedule
                  </span>
                  Due-date reminders
                </h3>
                {renderCategory('createdByMe', 'Tasks I created')}
                {renderCategory('assignedToMe', 'Tasks assigned to me')}
              </section>
              <p className={`${styles.hint} ${styles.fullWidth}`}>
                Turning a type off also hides its existing notifications.
              </p>
            </div>
          )}
          {deviceControls && (
            <details className={styles.device}>
              <summary>
                <span className="material-icons" aria-hidden="true">
                  devices
                </span>
                Browser &amp; mobile
                <span className={`material-icons ${styles.chevron}`} aria-hidden="true">
                  expand_more
                </span>
              </summary>
              <div className={styles.deviceControls}>{deviceControls}</div>
            </details>
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
