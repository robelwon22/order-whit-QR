'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

const ThemeContext = createContext({
  choice: 'auto',
  isDark: false,
  setChoice: () => {},
});

function getSystemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(isDark) {
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#1A120C' : '#F7F1E8');
}

export function ThemeProvider({ children }) {
  const [choice, setChoiceState] = useState('auto');
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_theme_choice');
    const path = window.location.pathname;
    setChoiceState(saved === 'light' || saved === 'dark' ? saved : path.startsWith('/bartender') ? 'dark' : 'auto');
    setSystemDark(getSystemDark());

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const isDark = choice === 'dark' || (choice === 'auto' && systemDark);
  useEffect(() => applyTheme(isDark), [isDark]);

  const setChoice = useCallback((next) => {
    if (!['auto', 'light', 'dark'].includes(next)) return;
    setChoiceState(next);
    localStorage.setItem('app_theme_choice', next);
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
