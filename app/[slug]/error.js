'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '../../components/ui/AppErrorFallback';

export default function CustomerMenuError({ error }) {
  useEffect(() => {
    console.error('Customer menu screen error boundary caught:', error);
  }, [error]);

  return <AppErrorFallback />;
}
