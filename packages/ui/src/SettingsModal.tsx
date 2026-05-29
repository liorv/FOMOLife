import React from 'react';
import type { UserPreferences } from './useUserPreferences';

interface SettingsModalProps {
  prefs: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  onClose: () => void;
}

const FONT_OPTIONS: { label: string; value: number; example: string }[] = [
  { label: 'Normal', value: 1, example: 'Aa' },
  { label: 'Large', value: 1.15, example: 'Aa' },
  { label: 'XL', value: 1.3, example: 'Aa' },
];

export function SettingsModal({ prefs, onSave, onClose }: SettingsModalProps) {
  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    onSave({ ...prefs, [key]: value });
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
          width: 'min(100%, 340px)',
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
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons" style={{ fontSize: '20px', color: 'var(--color-primary, #1a73e8)' }}>
              settings
            </span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            aria-label="Close settings"
          >
            <span className="material-icons" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* ── Font Size ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 500, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted, #5f6368)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icons" style={{ fontSize: '16px' }}>text_fields</span>
            Font Size
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {FONT_OPTIONS.map((opt) => {
              const active = prefs.fontScale === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('fontScale', opt.value)}
                  style={{
                    flex: 1,
                    padding: '10px 4px 8px',
                    borderRadius: '10px',
                    border: `2px solid ${active ? 'var(--color-primary, #1a73e8)' : 'var(--color-border, rgba(60,64,67,0.2))'}`,
                    background: active ? 'var(--color-primary, #1a73e8)' : 'transparent',
                    color: active ? '#fff' : 'var(--color-text, #202124)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.85rem',
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: `${opt.value * 0.9}rem`, fontWeight: 700 }}>{opt.example}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: 'var(--color-border, rgba(60,64,67,0.12))' }} />

        {/* ── Dark Mode ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 500, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted, #5f6368)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icons" style={{ fontSize: '16px' }}>
              {prefs.darkMode ? 'dark_mode' : 'light_mode'}
            </span>
            Dark Mode
          </div>
          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={prefs.darkMode}
            onClick={() => update('darkMode', !prefs.darkMode)}
            style={{
              width: '48px',
              height: '26px',
              borderRadius: '13px',
              border: 'none',
              background: prefs.darkMode ? 'var(--color-primary, #1a73e8)' : 'rgba(0,0,0,0.18)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '3px',
                left: prefs.darkMode ? '25px' : '3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>

        {/* ── Done ── */}
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
            cursor: 'pointer',
            marginTop: '4px',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
