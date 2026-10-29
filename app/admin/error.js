'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '../../components/ui/AppErrorFallback';

export default function AdminError({ error }) {
  useEffect(() => {
    console.error('Admin screen error boundary caught:', error);
  }, [error]);

  return <AppErrorFallback />;
}
