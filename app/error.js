'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '../components/ui/AppErrorFallback';

export default function Error({ error }) {
  useEffect(() => {
    console.error('App error boundary caught a render error:', error);
  }, [error]);

  return <AppErrorFallback />;
}
