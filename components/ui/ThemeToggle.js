'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { isValidThemeChoice, safeReadStorage, safeWriteStorage } from '../../lib/storage';

const ThemeContext = createContext({
  choice: 'auto',
  isDark: false,
  setChoice: () => {},
});

function getSystemDark() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(isDark) {
  if (typeof document === 'undefined') return;
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#1A120C' : '#F7F1E8');
}

export function ThemeProvider({ children }) {
  const [choice, setChoiceState] = useState('auto');
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    try {
      const raw = safeReadStorage('app_theme_choice', null);
      const saved = raw && isValidThemeChoice(raw) ? raw : null;
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const fallbackChoice = path.startsWith('/bartender') ? 'dark' : 'auto';
      setChoiceState(saved || fallbackChoice);
      setSystemDark(getSystemDark());

      const media = typeof window !== 'undefined' && !!window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
      const onChange = (event) => setSystemDark(Boolean(event?.matches));
      media?.addEventListener?.('change', onChange);
      return () => media?.removeEventListener?.('change', onChange);
    } catch (error) {
      console.warn('Theme preference unavailable, defaulting to auto.', error);
      setChoiceState('auto');
      setSystemDark(getSystemDark());
    }
  }, []);

  const isDark = choice === 'dark' || (choice === 'auto' && systemDark);
  useEffect(() => {
    try {
      applyTheme(isDark);
    } catch (error) {
      console.warn('Theme apply failed.', error);
    }
  }, [isDark]);

  const setChoice = useCallback((next) => {
    if (!isValidThemeChoice(next)) return;
    setChoiceState(next);
    safeWriteStorage('app_theme_choice', next);
  }, []);

  const value = useMemo(() => ({ choice, isDark, systemDark, setChoice }), [choice, isDark, systemDark, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ value, onChange, compact = false }) {
  const theme = useTheme();
  const choice = value ?? theme.choice;
  const setChoice = onChange ?? theme.setChoice;
  const next = choice === 'auto' ? 'light' : choice === 'light' ? 'dark' : 'auto';
  const Icon = choice === 'dark' ? Moon : choice === 'light' ? Sun : Monitor;
  const label = choice === 'auto' ? 'Auto' : choice === 'light' ? 'Light' : 'Dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${label}. Change theme`}
      title={`Theme: ${label} · click to change`}
      onClick={() => setChoice(next)}
    >
      <Icon size={16} aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </button>
  );
}
