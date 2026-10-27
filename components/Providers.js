'use client';

import React from 'react';
import { I18nProvider } from '../lib/i18n';
import { ToastProvider } from './ui/Toast';
import { ThemeProvider } from './ui/ThemeToggle';

export function Providers({ children }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
