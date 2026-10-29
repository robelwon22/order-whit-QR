'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '../components/ui/AppErrorFallback';

export default function GlobalError({ error }) {
  useEffect(() => {
    console.error('Global app error boundary caught an uncaught exception:', error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, background: '#1A120C', color: '#F3EADF', fontFamily: 'Inter, sans-serif' }}>
        <AppErrorFallback />
      </body>
    </html>
  );
}
