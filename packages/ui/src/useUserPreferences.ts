import { useEffect, useState } from 'react';

export interface UserPreferences {
  /** Multiplier applied to base font size. 1 = Normal, 1.15 = Large, 1.3 = XL */
  fontScale: number;
  darkMode: boolean;
}

export const DEFAULT_PREFS: UserPreferences = { fontScale: 1, darkMode: false };
const STORAGE_KEY = 'fomo:prefs';

export function loadPrefs(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function applyPrefs(prefs: UserPreferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--font-scale', String(prefs.fontScale));
  root.setAttribute('data-theme', prefs.darkMode ? 'dark' : 'light');
}

export function useUserPreferences(): [UserPreferences, (prefs: UserPreferences) => void] {
  const [prefs, setPrefsState] = useState<UserPreferences>(DEFAULT_PREFS);

  // Apply stored prefs on mount (client-side only)
  useEffect(() => {
    const loaded = loadPrefs();
    setPrefsState(loaded);
    applyPrefs(loaded);
  }, []);

  const setPrefs = (next: UserPreferences) => {
    setPrefsState(next);
    applyPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore – storage might be full or blocked
    }
  };

  return [prefs, setPrefs];
}
