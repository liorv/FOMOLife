'use client';

import React, { useEffect, useState } from 'react';
import type { TaskNotificationSettings, TaskNotifyBefore } from '@myorg/types';

interface NotificationSettingsModalProps {
  onClose: () => void;
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

export function NotificationSettingsModal({ onClose }: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<TaskNotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/tasks/notification-settings');
        if (res.ok) {
          const d = await res.json();
          if (active && d.settings) setSettings(d.settings);
        }
      } catch { /* fall back to defaults */ } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const persist = async (next: TaskNotificationSettings) => {
    setSettings(next);
    setSaving(true);
    try {
      await fetch('/api/tasks/notification-settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch { /* non-critical */ } finally {
      setSaving(false);
    }
  };

  const updateCategory = (
    category: 'createdByMe' | 'assignedToMe',
    patch: Partial<TaskNotificationSettings['createdByMe']>,
  ) => {
    void persist({ ...settings, [category]: { ...settings[category], ...patch } });
  };

  const renderCategory = (
    category: 'createdByMe' | 'assignedToMe',
    title: string,
    description: string,
  ) => {
    const cat = settings[category];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{title}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #5f6368)' }}>{description}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cat.enabled}
            aria-label={`Toggle ${title.toLowerCase()} reminders`}
            onClick={() => updateCategory(category, { enabled: !cat.enabled })}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              background: cat.enabled ? 'var(--color-primary, #1a73e8)' : 'rgba(0,0,0,0.18)',
              cursor: 'pointer',
              position: 'relative',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '3px',
                left: cat.enabled ? '23px' : '3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>
        {cat.enabled && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {NOTIFY_BEFORE_OPTIONS.map((opt) => {
              const active = cat.notifyBefore === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateCategory(category, { notifyBefore: opt.value })}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: '8px',
                    border: `1.5px solid ${active ? 'var(--color-primary, #1a73e8)' : 'var(--color-border, rgba(60,64,67,0.2))'}`,
                    background: active ? 'var(--color-primary, #1a73e8)' : 'transparent',
                    color: active ? '#fff' : 'var(--color-text, #202124)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(100%, 380px)',
          background: 'var(--color-surface, #fff)',
          color: 'var(--color-text, #202124)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons" style={{ fontSize: '20px', color: 'var(--color-primary, #1a73e8)' }}>
              notifications
            </span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Notification settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              color: 'var(--color-text-muted, #5f6368)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-icons" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {loading ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #5f6368)' }}>Loading…</div>
        ) : (
          <>
            {renderCategory('createdByMe', 'Tasks I created', 'Reminders for due dates on tasks you own.')}
            <div style={{ height: '1px', background: 'var(--color-border, rgba(60,64,67,0.12))' }} />
            {renderCategory('assignedToMe', 'Tasks assigned to me', 'Reminders for due dates on tasks assigned to you.')}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '11px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--color-primary, #1a73e8)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
